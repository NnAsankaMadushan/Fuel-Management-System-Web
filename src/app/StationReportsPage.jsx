import { useEffect, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { getStationLogs, getStationSummary } from '../api/api';
import { useToastAlert } from './appToast';
import {
  ActionTile,
  baseChartOptions,
  buildDailyFuelSeries,
  chartColors,
  compactNumber,
  EmptyState,
  formatDateTime,
  formatFuel,
  formatStatus,
  getErrorMessage,
  KeyValue,
  MetricCard,
  Panel,
} from './ProtectedShared';

export const StationSummaryPage = () => {
  const [summary, setSummary] = useState({
    totalStations: 0,
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
    chart: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load station summary',
    idPrefix: 'station-summary-error',
  });

  useEffect(() => {
    let active = true;

    const loadSummary = async () => {
      try {
        const data = await getStationSummary();
        if (active) {
          setSummary(data || {});
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load station summary.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Stations" value={compactNumber(summary.totalStations)} note="In your station scope" />
        <MetricCard tone="blue" label="Transactions" value={compactNumber(summary.totalTransactions)} note="Recent seven-day volume" />
        <MetricCard tone="amber" label="Petrol" value={formatFuel(summary.totalAvailablePetrol)} note="Available now" />
        <MetricCard tone="violet" label="Diesel" value={formatFuel(summary.totalAvailableDiesel)} note="Available now" />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Dispensing Trend" title="Seven-day litres" description="Recent dispensing activity for the scoped station records.">
          {isLoading ? (
            <EmptyState title="Loading summary" description="Fetching the recent dispensing trend." />
          ) : (
            <div className="chart-frame">
              <Bar
                data={{
                  labels: (summary.chart || []).map((item) => item.label),
                  datasets: [
                    {
                      label: 'Litres dispensed',
                      data: (summary.chart || []).map((item) => item.litres),
                      backgroundColor: chartColors.blue,
                      borderRadius: 12,
                    },
                  ],
                }}
                options={baseChartOptions}
              />
            </div>
          )}
        </Panel>

        <Panel eyebrow="Fuel Balance" title="Available stock" description="Petrol and diesel currently available in the active scope.">
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
                cutout: '70%',
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

          <div className="detail-stack">
            <KeyValue label="Total litres dispensed" value={formatFuel(summary.totalLitresDispensed)} />
            <KeyValue label="Total transactions" value={compactNumber(summary.totalTransactions)} />
          </div>
        </Panel>
      </section>
    </div>
  );
};

export const StationLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load station logs',
    idPrefix: 'station-logs-error',
  });

  useEffect(() => {
    let active = true;

    const loadLogs = async () => {
      try {
        const data = await getStationLogs();
        if (active) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load station logs.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadLogs();

    return () => {
      active = false;
    };
  }, []);

  const totalLitres = logs.reduce((sum, log) => sum + Number(log.litresPumped || 0), 0);
  const dailySeries = buildDailyFuelSeries(logs);

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Transactions" value={compactNumber(logs.length)} note="Station-scope fuel events" />
        <MetricCard tone="blue" label="Litres" value={formatFuel(totalLitres)} note="Total recorded litres" />
        <MetricCard tone="amber" label="Vehicles" value={compactNumber(new Set(logs.map((log) => log.vehicleNumber)).size)} note="Unique vehicles served" />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Activity Trend" title="Last seven days" description="Daily litres recorded by the station scope.">
          <div className="chart-frame">
            <Line
              data={{
                labels: dailySeries.map((item) => item.label),
                datasets: [
                  {
                    label: 'Litres pumped',
                    data: dailySeries.map((item) => item.litres),
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

        <Panel eyebrow="Log Detail" title="Station transactions" description="Latest vehicle transactions captured in the assigned station scope.">
          {isLoading ? (
            <EmptyState title="Loading station logs" description="Fetching the current transaction history." />
          ) : logs.length === 0 ? (
            <EmptyState title="No logs found" description="Transaction history appears here after the first QR transaction." />
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
                  {logs.map((log) => (
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
      </section>
    </div>
  );
};

export const OperatorDashboardPage = () => {
  const [summary, setSummary] = useState({
    totalStations: 0,
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
    chart: [],
  });
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load operator dashboard',
    idPrefix: 'operator-dashboard-error',
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        const [summaryData, logData] = await Promise.all([getStationSummary(), getStationLogs()]);
        if (active) {
          setSummary(summaryData || {});
          setLogs(Array.isArray(logData) ? logData : []);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load operator dashboard.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Stations" value={compactNumber(summary.totalStations)} note="Assigned station scope" />
        <MetricCard tone="blue" label="Transactions" value={compactNumber(summary.totalTransactions)} note="Recent seven-day count" />
        <MetricCard tone="amber" label="Dispensed" value={formatFuel(summary.totalLitresDispensed)} note="Litres recorded recently" />
        <MetricCard tone="violet" label="Available Fuel" value={formatFuel((summary.totalAvailablePetrol || 0) + (summary.totalAvailableDiesel || 0))} note="Combined current stock" />
      </section>

      <section className="action-tile-grid">
        <ActionTile to="/v-register" label="Register Vehicle" description="Create a vehicle record when a driver needs intake support." />
        <ActionTile to="/scan-qr" label="Start QR Scan" description="Open the transaction screen used at the pump." />
        <ActionTile to="/s-fuel-quota" label="Open Summary" description="Inspect current station fuel balance and recent throughput." />
        <ActionTile to="/s-prev-logs" label="Review Logs" description="Check the latest station transactions from the operator view." />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Station Activity" title="Seven-day dispensing trend" description="Recent litres dispensed across your assigned station scope.">
          {isLoading ? (
            <EmptyState title="Loading summary" description="Fetching operator summary metrics." />
          ) : (
            <div className="chart-frame">
              <Line
                data={{
                  labels: (summary.chart || []).map((item) => item.label),
                  datasets: [
                    {
                      label: 'Litres dispensed',
                      data: (summary.chart || []).map((item) => item.litres),
                      borderColor: chartColors.blue,
                      backgroundColor: 'rgba(47, 111, 237, 0.16)',
                      fill: true,
                      tension: 0.35,
                    },
                  ],
                }}
                options={baseChartOptions}
              />
            </div>
          )}
        </Panel>

        <Panel eyebrow="Recent Transactions" title="Forecourt activity" description="Latest vehicle transactions captured through your station scope.">
          {logs.length === 0 ? (
            <EmptyState title="No activity yet" description="Recent forecourt transactions will appear here once recorded." />
          ) : (
            <div className="compact-list">
              {logs.slice(0, 6).map((log) => (
                <div key={log._id} className="compact-list-item">
                  <div>
                    <strong>{log.vehicleNumber}</strong>
                    <p>{log.stationName} • {formatStatus(log.fuelType)}</p>
                  </div>
                  <div className="compact-list-meta">
                    <span>{formatDateTime(log.date)}</span>
                    <strong>{formatFuel(log.litresPumped)}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
};
