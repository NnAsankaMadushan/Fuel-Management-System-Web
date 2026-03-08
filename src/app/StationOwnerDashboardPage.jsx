import { useCallback, useEffect, useState } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  deleteStationOperator,
  getMyStations,
  getStationLogs,
  getStationSummary,
  updateStation,
} from '../api/api';
import {
  ActionDialog,
  ActionTile,
  baseChartOptions,
  chartColors,
  compactNumber,
  EmptyState,
  formatDateTime,
  formatFuel,
  formatStatus,
  getErrorMessage,
  getStationStatus,
  KeyValue,
  MetricCard,
  Panel,
  StatusPill,
  useActionDialog,
} from './ProtectedShared';
import { useToastAlert } from './appToast';

export const StationOwnerDashboardPage = () => {
  const [stations, setStations] = useState([]);
  const [summary, setSummary] = useState({
    totalStations: 0,
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
    chart: [],
  });
  const [logs, setLogs] = useState([]);
  const [stockDrafts, setStockDrafts] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const {
    actionDialog,
    promptValue,
    setPromptValue,
    closeActionDialog,
    openConfirmDialog,
  } = useActionDialog();

  useToastAlert(feedback, {
    status: feedbackIsError ? 'error' : 'success',
    title: feedbackIsError ? 'Station owner action failed' : 'Station owner update',
    idPrefix: 'station-owner-feedback',
  });
  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load station owner dashboard',
    idPrefix: 'station-owner-error',
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [stationData, summaryData, logData] = await Promise.all([
        getMyStations(),
        getStationSummary(),
        getStationLogs(),
      ]);

      const nextStations = Array.isArray(stationData) ? stationData : [];
      setStations(nextStations);
      setSummary(summaryData || {});
      setLogs(Array.isArray(logData) ? logData : []);
      setStockDrafts(
        Object.fromEntries(
          nextStations.map((station) => [
            station._id,
            {
              availablePetrol: '',
              availableDiesel: '',
            },
          ]),
        ),
      );
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load station owner dashboard.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStockDraftChange = (stationId, field, value) => {
    if (!/^\d*(\.\d{0,2})?$/.test(value)) {
      return;
    }

    setStockDrafts((current) => ({
      ...current,
      [stationId]: {
        ...(current[stationId] || {}),
        [field]: value,
      },
    }));
  };

  const handleStockUpdate = async (station) => {
    const draft = stockDrafts[station._id] || {};
    setFeedback('');

    if (draft.availablePetrol === '' && draft.availableDiesel === '') {
      setFeedback('Enter petrol or diesel stock before updating.');
      setFeedbackIsError(true);
      return;
    }

    setBusyId(station._id);

    try {
      const payload = {};

      if (draft.availablePetrol !== '') {
        payload.availablePetrol = draft.availablePetrol;
      }

      if (draft.availableDiesel !== '') {
        payload.availableDiesel = draft.availableDiesel;
      }

      const response = await updateStation(station.station_regNumber, payload);
      setFeedback(response?.message || 'Fuel stock updated successfully.');
      setFeedbackIsError(false);
      await loadData();
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to update station fuel stock.'));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const handleDeleteOperator = async (operator) => {
    const operatorId = typeof operator === 'string' ? operator : operator?._id;
    const operatorLabel = typeof operator === 'string' ? operator : operator?.name || operator?.email || 'operator';

    if (!operatorId) {
      return;
    }

    const confirmed = await openConfirmDialog({
      eyebrow: 'Operator Removal',
      title: `Remove ${operatorLabel}?`,
      message: 'This will revoke the operator account from the assigned station immediately.',
      confirmLabel: 'Remove operator',
      cancelLabel: 'Keep operator',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setBusyId(operatorId);
    setFeedback('');

    try {
      const response = await deleteStationOperator(operatorId);
      setFeedback(response?.message || 'Operator removed.');
      setFeedbackIsError(false);
      await loadData();
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to remove the operator.'));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const totalOperators = stations.reduce((sum, station) => sum + (station.stationOperators?.length || 0), 0);
  const approvedStations = stations.filter((station) => getStationStatus(station) === 'approved');

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Stations" value={compactNumber(summary.totalStations || stations.length)} note="Owned by your account" />
        <MetricCard tone="violet" label="Operators" value={compactNumber(totalOperators)} note="Assigned across your stations" />
        <MetricCard tone="blue" label="Petrol" value={formatFuel(summary.totalAvailablePetrol)} note="Available station stock" />
        <MetricCard tone="amber" label="Diesel" value={formatFuel(summary.totalAvailableDiesel)} note="Available station stock" />
      </section>

      <section className="action-tile-grid">
        <ActionTile to="/s-register" label="Register Station" description="Create a new station record with location and opening stock." />
        <ActionTile to="/create-operator" label="Create Operator" description="Provision station operator access from the owner workspace." />
        <ActionTile to="/scan-qr" label="Scan QR" description="Open the forecourt QR transaction screen." />
        <ActionTile to="/s-prev-logs" label="Open Logs" description="Inspect the latest station transactions and activity." />
      </section>

      {stations.length > 0 && approvedStations.length === 0 ? (
        <div className="entity-card-note">
          Your station records are waiting for admin approval. Fuel stock updates and operator creation stay locked until approval.
        </div>
      ) : null}

      <section className="two-column-grid">
        <Panel eyebrow="Fuel Trend" title="Last seven days" description="Dispensed litres across the station scope.">
          <div className="chart-frame">
            <Line
              data={{
                labels: (summary.chart || []).map((item) => item.label),
                datasets: [
                  {
                    label: 'Litres dispensed',
                    data: (summary.chart || []).map((item) => item.litres),
                    borderColor: chartColors.teal,
                    backgroundColor: chartColors.tealSoft,
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={baseChartOptions}
            />
          </div>
        </Panel>

        <Panel eyebrow="Fuel Split" title="Current stock balance" description="Combined available petrol and diesel across your stations.">
          <div className="chart-frame chart-frame--compact">
            <Doughnut
              data={{
                labels: ['Petrol', 'Diesel'],
                datasets: [
                  {
                    data: [summary.totalAvailablePetrol || 0, summary.totalAvailableDiesel || 0],
                    backgroundColor: [chartColors.blue, chartColors.amber],
                    borderWidth: 0,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                  legend: {
                    position: 'bottom',
                    labels: {
                      usePointStyle: true,
                      boxWidth: 10,
                      color: '#415261',
                    },
                  },
                },
              }}
            />
          </div>

          <div className="fuel-balance-values">
            <div className="fuel-balance-value-card">
              <span className="fuel-balance-swatch fuel-balance-swatch--petrol" aria-hidden="true" />
              <div className="fuel-balance-value-copy">
                <span>Petrol</span>
                <strong>{Number(summary.totalAvailablePetrol || 0).toLocaleString()} L</strong>
              </div>
            </div>
            <div className="fuel-balance-value-card">
              <span className="fuel-balance-swatch fuel-balance-swatch--diesel" aria-hidden="true" />
              <div className="fuel-balance-value-copy">
                <span>Diesel</span>
                <strong>{Number(summary.totalAvailableDiesel || 0).toLocaleString()} L</strong>
              </div>
            </div>
          </div>
        </Panel>
      </section>

      <Panel eyebrow="Station Management" title="Owned stations" description="Update fuel stock and maintain operator assignments per station.">
        {isLoading ? (
          <EmptyState title="Loading stations" description="Fetching your assigned station records." />
        ) : stations.length === 0 ? (
          <EmptyState title="No stations yet" description="Register your first station to unlock operator and stock workflows." />
        ) : (
          <div className="entity-card-grid">
            {stations.map((station) => (
              <article key={station._id} className="entity-card entity-card--station">
                <div className="entity-card-header">
                  <div>
                    <strong>{station.stationName}</strong>
                    <p>{station.location}</p>
                  </div>
                  <div className="compact-list-meta">
                    <StatusPill status={getStationStatus(station)} />
                    <span className="text-chip">{station.station_regNumber}</span>
                  </div>
                </div>

                <div className="entity-card-grid">
                  <KeyValue label="Status" value={formatStatus(getStationStatus(station))} />
                  <KeyValue label="Petrol" value={formatFuel(station.availablePetrol)} />
                  <KeyValue label="Diesel" value={formatFuel(station.availableDiesel)} />
                  <KeyValue label="Operators" value={compactNumber(station.stationOperators?.length || 0)} />
                  <KeyValue label="Vehicles" value={compactNumber(station.registeredVehicles?.length || 0)} />
                </div>

                {getStationStatus(station) !== 'approved' ? (
                  <div className="entity-card-note">
                    {station.approvalNote || 'Waiting for admin approval before this station can be used.'}
                  </div>
                ) : null}

                <div className="form-grid form-grid--2">
                  <label className="form-field">
                    <span>Petrol (L)</span>
                    <input
                      value={stockDrafts[station._id]?.availablePetrol ?? ''}
                      onChange={(event) => handleStockDraftChange(station._id, 'availablePetrol', event.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className="form-field">
                    <span>Diesel (L)</span>
                    <input
                      value={stockDrafts[station._id]?.availableDiesel ?? ''}
                      onChange={(event) => handleStockDraftChange(station._id, 'availableDiesel', event.target.value)}
                      placeholder="0"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  className="primary-button"
                  onClick={() => handleStockUpdate(station)}
                  disabled={busyId === station._id || getStationStatus(station) !== 'approved'}
                >
                  {busyId === station._id ? 'Saving...' : 'Update Fuel Stock'}
                </button>

                <div className="subsection-block">
                  <h3>Operators</h3>
                  {(station.stationOperators || []).length === 0 ? (
                    <p className="subtle-copy">No operators assigned yet.</p>
                  ) : (
                    <div className="compact-list">
                      {station.stationOperators.map((operator) => (
                        <div key={typeof operator === 'string' ? operator : operator._id} className="compact-list-item">
                          <div>
                            <strong>{typeof operator === 'string' ? operator : operator.name || operator.email}</strong>
                            <p>{typeof operator === 'string' ? '' : operator.email}</p>
                          </div>
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => handleDeleteOperator(operator)}
                            disabled={busyId === (typeof operator === 'string' ? operator : operator._id)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel eyebrow="Recent Activity" title="Station transactions" description="Latest transactions captured across your stations.">
        {logs.length === 0 ? (
          <EmptyState title="No transactions yet" description="Transaction records will appear once QR scans are recorded." />
        ) : (
          <div className="table-container">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle</th>
                  <th>Station</th>
                  <th>Fuel</th>
                  <th>Litres</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 8).map((log) => (
                  <tr key={log._id}>
                    <td data-label="Date">{formatDateTime(log.date)}</td>
                    <td data-label="Vehicle">{log.vehicleNumber}</td>
                    <td data-label="Station">{log.stationName}</td>
                    <td data-label="Fuel">{formatStatus(log.fuelType)}</td>
                    <td data-label="Litres">{formatFuel(log.litresPumped)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <ActionDialog
        dialog={actionDialog}
        promptValue={promptValue}
        onPromptValueChange={setPromptValue}
        onClose={closeActionDialog}
      />
    </div>
  );
};
