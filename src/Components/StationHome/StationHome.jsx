import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import Footer from '../footer/footer';
import './StationHome.css';
import { Link } from 'react-router-dom';
import { getMyStations, updateStation } from '../../api/api';
import FuelAvailabilityChart from '../FuelAvailabilityChart/FuelAvailabilityChart';

const stationActions = [
  {
    to: '/s-register',
    mark: 'RG',
    title: 'Register station',
    accent: 'rgba(249, 115, 22, 0.28)',
    soft: 'var(--accent-soft)',
    text: 'var(--accent-strong)',
  },
  {
    to: '/create-operator',
    mark: 'OP',
    title: 'Create operator',
    accent: 'rgba(13, 148, 136, 0.26)',
    soft: 'var(--teal-soft)',
    text: 'var(--teal)',
  },
  {
    to: '/scan-qr',
    mark: 'QR',
    title: 'Scan QR',
    accent: 'rgba(255, 143, 74, 0.32)',
    soft: 'rgba(255, 240, 221, 0.96)',
    text: 'var(--accent-strong)',
  },
  {
    to: '/s-prev-logs',
    mark: 'LG',
    title: 'View logs',
    accent: 'rgba(24, 33, 47, 0.18)',
    soft: 'rgba(24, 33, 47, 0.08)',
    text: 'var(--text)',
  },
];

const StationHome = () => {
  const [stations, setStations] = useState([]);
  const [stockDrafts, setStockDrafts] = useState({});
  const [stockStatus, setStockStatus] = useState(null);
  const [savingStationId, setSavingStationId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const applyStations = (stationList) => {
    setStations(stationList);
    setStockDrafts(
      Object.fromEntries(
        stationList.map((station) => [
          station._id,
          {
            availablePetrol: '',
            availableDiesel: '',
          },
        ]),
      ),
    );
  };

  const loadStations = async () => {
    try {
      const data = await getMyStations();
      applyStations(data);
      setError('');
    } catch (fetchError) {
      setError(fetchError.response?.data?.message || fetchError.message || 'Failed to fetch stations');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStations();
  }, []);

  const handleDeleteOperator = async (operatorId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stations/deleteStationOperator/${operatorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete operator');
      }

      await loadStations();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

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
    try {
      setSavingStationId(station._id);
      setStockStatus(null);
      const draft = stockDrafts[station._id] || {};

      if (!draft.availablePetrol && !draft.availableDiesel) {
        setStockStatus({
          stationId: station._id,
          type: 'error',
          message: 'Enter petrol or diesel amount before updating fuel stock.',
        });
        return;
      }

      const payload = {};

      if (draft.availablePetrol !== '') {
        payload.availablePetrol = draft.availablePetrol;
      }

      if (draft.availableDiesel !== '') {
        payload.availableDiesel = draft.availableDiesel;
      }

      const response = await updateStation(station.station_regNumber, payload);

      setStockStatus({
        stationId: station._id,
        type: 'success',
        message: response.message || 'Fuel stock updated successfully.',
      });
      await loadStations();
    } catch (updateError) {
      setStockStatus({
        stationId: station._id,
        type: 'error',
        message: updateError.response?.data?.message || 'Failed to update fuel stock.',
      });
    } finally {
      setSavingStationId('');
    }
  };

  const totalOperators = stations.reduce((sum, station) => sum + (station.stationOperators?.length || 0), 0);
  const totalAvailablePetrol = stations.reduce((sum, station) => sum + (station.availablePetrol || 0), 0);
  const totalAvailableDiesel = stations.reduce((sum, station) => sum + (station.availableDiesel || 0), 0);

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell page-shell--wide">
        <section className="station-hero panel rise-in">
          <div className="station-hero-copy">
            <span className="section-badge">Station</span>
            <h1>Station dashboard</h1>
            <p className="lead-text">Manage stations, operators, and available fuel stock.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Stations</div>
              <div className="metric-value">{stations.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Operators</div>
              <div className="metric-value">{totalOperators}</div>
            </div>
          </div>

          <FuelAvailabilityChart
            petrol={totalAvailablePetrol}
            diesel={totalAvailableDiesel}
            title="Overall available fuel"
            subtitle="Live fuel split across all stations assigned to you."
            badge="Fuel Status"
            isLoading={isLoading}
            className="station-hero-chart"
          />
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="section-badge">Quick Actions</span>
              <h2>Common tasks</h2>
            </div>
          </div>

          <div className="action-grid">
            {stationActions.map((action) => (
              <Link
                key={action.title}
                to={action.to}
                className="action-card"
                style={{
                  '--tile-accent': action.accent,
                  '--tile-soft': action.soft,
                  '--tile-text': action.text,
                }}
              >
                <div className="action-card-top">
                  <h3>{action.title}</h3>
                  <span className="action-card-mark">{action.mark}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="section-badge">Stations</span>
              <h2>My stations</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state">Loading stations...</div>
          ) : error ? (
            <div className="response-banner error-banner">{error}</div>
          ) : stations.length === 0 ? (
            <div className="empty-state">No stations registered yet.</div>
          ) : (
            <div className="station-card-grid">
              {stations.map((station) => (
                <article key={station._id} className="station-card section-card">
                  <div className="station-card-header">
                    <div>
                      <h3>{station.stationName}</h3>
                      <p>{station.location}</p>
                    </div>
                    <Link to="/s-fuel-quota" className="secondary-button">
                      Fuel summary
                    </Link>
                  </div>

                  <div className="station-card-stats">
                    <div>
                      <span className="metric-label">Operators</span>
                      <strong>{station.stationOperators?.length || 0}</strong>
                    </div>
                  </div>

                  <div className="station-fuel-layout">
                    <FuelAvailabilityChart
                      petrol={station.availablePetrol || 0}
                      diesel={station.availableDiesel || 0}
                      title="Station fuel status"
                      subtitle="Available petrol and diesel for this station."
                      badge="Fuel Status"
                      compact
                      className="station-inline-chart"
                    />
                  </div>

                  <div className="station-stock-editor">
                    <div className="station-block-title">Update available fuel</div>
                    <div className="field-grid station-stock-fields">
                      <label className="field-group">
                        <span>Petrol (L)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={stockDrafts[station._id]?.availablePetrol ?? ''}
                          onChange={(event) => handleStockDraftChange(station._id, 'availablePetrol', event.target.value)}
                          placeholder="0"
                        />
                      </label>

                      <label className="field-group">
                        <span>Diesel (L)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={stockDrafts[station._id]?.availableDiesel ?? ''}
                          onChange={(event) => handleStockDraftChange(station._id, 'availableDiesel', event.target.value)}
                          placeholder="0"
                        />
                      </label>
                    </div>

                    <button
                      type="button"
                      className="button station-stock-button"
                      onClick={() => handleStockUpdate(station)}
                      disabled={savingStationId === station._id}
                    >
                      {savingStationId === station._id ? 'Saving...' : 'Update fuel stock'}
                    </button>

                    {stockStatus?.stationId === station._id ? (
                      <div className={`response-banner${stockStatus.type === 'error' ? ' error-banner' : ''}`}>
                        {stockStatus.message}
                      </div>
                    ) : null}
                  </div>

                  <div className="station-list-block">
                    <div className="station-block-title">Operators</div>
                    {(station.stationOperators || []).length > 0 ? (
                      <div className="list-stack">
                        {station.stationOperators.map((operator) => {
                          const operatorId = typeof operator === 'string' ? operator : operator?._id;
                          const operatorLabel =
                            typeof operator === 'string'
                              ? operator
                              : operator?.name || operator?.email || 'Operator';

                          return (
                            <div key={operatorId} className="list-row">
                              <strong>{operatorLabel}</strong>
                              <button
                                type="button"
                                className="danger-button station-delete-button"
                                onClick={() => handleDeleteOperator(operatorId)}
                              >
                                Remove
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-state station-inline-empty">No operators.</div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StationHome;
