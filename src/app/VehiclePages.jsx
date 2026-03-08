import { useEffect, useRef, useState } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate, useParams } from 'react-router-dom';
import { getMyVehicles, getVehicleById, getVehicleLogs, registerVehicle } from '../api/api';
import { useToastAlert } from './appToast';
import { useSession } from './session';
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
  getVehicleStatus,
  KeyValue,
  MetricCard,
  Panel,
  StatusPill,
  VehicleCard,
} from './ProtectedShared';

const SELF_SERVICE_VEHICLE_ROLES = new Set(['vehicle_owner', 'station_owner', 'station_operator']);

const VehiclePickerChevronIcon = ({ isOpen }) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" className={`vehicle-picker-trigger-icon${isOpen ? ' vehicle-picker-trigger-icon--open' : ''}`}>
    <path
      d="M5 7.5 10 12.5 15 7.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const VehiclePicker = ({ vehicles, selectedVehicleId, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const selectedVehicle = vehicles.find((vehicle) => vehicle._id === selectedVehicleId) || null;

  useEffect(() => {
    setIsOpen(false);
  }, [selectedVehicleId]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`vehicle-picker${isOpen ? ' vehicle-picker--open' : ''}`} ref={wrapperRef}>
      <button
        type="button"
        className="vehicle-picker-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span className="vehicle-picker-trigger-copy">
          <strong>{selectedVehicle?.vehicleNumber || 'Select a vehicle'}</strong>
          <span>
            {selectedVehicle
              ? `${formatStatus(selectedVehicle.vehicleType)} • ${formatFuel(selectedVehicle.remainingQuota)} remaining`
              : 'Choose a registered vehicle to open its record.'}
          </span>
        </span>
        <VehiclePickerChevronIcon isOpen={isOpen} />
      </button>

      {isOpen ? (
        <div className="vehicle-picker-menu" role="listbox" aria-label="Registered vehicles">
          {vehicles.map((vehicle) => {
            const vehicleStatus = getVehicleStatus(vehicle);
            const isActive = vehicle._id === selectedVehicleId;

            return (
              <button
                key={vehicle._id}
                type="button"
                role="option"
                aria-selected={isActive}
                className={`vehicle-picker-option${isActive ? ' vehicle-picker-option--active' : ''}`}
                onClick={() => {
                  setIsOpen(false);
                  onSelect(vehicle._id);
                }}
              >
                <span className="vehicle-picker-option-copy">
                  <strong>{vehicle.vehicleNumber}</strong>
                  <span>{`${formatStatus(vehicle.vehicleType)} • ${formatFuel(vehicle.remainingQuota)} remaining`}</span>
                </span>
                <StatusPill status={vehicleStatus} />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export const VehicleDashboardPage = () => {
  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load vehicle dashboard',
    idPrefix: 'vehicle-dashboard-error',
  });

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setIsLoading(true);
      setError('');

      try {
        const [vehicleData, logData] = await Promise.all([getMyVehicles(), getVehicleLogs()]);

        if (!active) {
          return;
        }

        setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
        setLogs(Array.isArray(logData) ? logData : []);
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load vehicle dashboard data.'));
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

  const totalAllocated = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.allocatedQuota || 0), 0);
  const totalRemaining = vehicles.reduce((sum, vehicle) => sum + Number(vehicle.remainingQuota || 0), 0);
  const totalUsed = totalAllocated - totalRemaining;
  const approvedVehicles = vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'approved').length;
  const recentFuelSeries = buildDailyFuelSeries(logs);

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Vehicles" value={compactNumber(vehicles.length)} note="Registered to your account" />
        <MetricCard tone="blue" label="Approved" value={compactNumber(approvedVehicles)} note="Ready for fueling" />
        <MetricCard tone="amber" label="Remaining Quota" value={formatFuel(totalRemaining)} note="Available across all vehicles" />
        <MetricCard tone="violet" label="Used Quota" value={formatFuel(totalUsed)} note="Already dispensed this cycle" />
      </section>

      <section className="action-tile-grid">
        <ActionTile to="/v-register" label="Register Vehicle" description="Create a new vehicle record and route it into approval." />
        <ActionTile to="/prev-logs" label="Review Fuel Logs" description="Open your personal fueling history and transaction totals." />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Quota Mix" title="Used vs remaining quota" description="Aggregate quota balance across all approved and pending vehicles.">
          <div className="chart-frame chart-frame--compact">
            <Doughnut
              data={{
                labels: ['Remaining quota', 'Used quota'],
                datasets: [
                  {
                    data: [totalRemaining, Math.max(totalUsed, 0)],
                    backgroundColor: [chartColors.teal, chartColors.amber],
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
        </Panel>

        <Panel eyebrow="Recent Usage" title="Last seven days" description="Daily litres pumped from your latest transaction history.">
          <div className="chart-frame">
            <Bar
              data={{
                labels: recentFuelSeries.map((item) => item.label),
                datasets: [
                  {
                    label: 'Litres pumped',
                    data: recentFuelSeries.map((item) => item.litres),
                    backgroundColor: chartColors.blue,
                    borderRadius: 12,
                  },
                ],
              }}
              options={baseChartOptions}
            />
          </div>
        </Panel>
      </section>

      <Panel eyebrow="Registered Vehicles" title="Vehicle records" description="Each card shows approval state and current quota balance.">
        {isLoading ? (
          <EmptyState title="Loading vehicles" description="Fetching your registered vehicles." />
        ) : vehicles.length === 0 ? (
          <EmptyState title="No vehicles yet" description="Use the register action to add your first vehicle." />
        ) : (
          <div className="entity-card-grid">
            {vehicles.map((vehicle) => (
              <VehicleCard key={vehicle._id} vehicle={vehicle} />
            ))}
          </div>
        )}
      </Panel>

      <Panel eyebrow="Recent Transactions" title="Fuel activity" description="Latest fueling transactions tied to your vehicles.">
        {isLoading ? (
          <EmptyState title="Loading activity" description="Fetching your transaction history." />
        ) : logs.length === 0 ? (
          <EmptyState title="No logs yet" description="Transaction history will appear after the first station scan." />
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
                    <td data-label="Vehicle">{log.vehicleNumber || 'N/A'}</td>
                    <td data-label="Station">{log.stationName || 'N/A'}</td>
                    <td data-label="Fuel">{formatStatus(log.fuelType)}</td>
                    <td data-label="Litres">{formatFuel(log.litresPumped)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
};

export const VehicleRegisterPage = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    vehicleType: '',
    fuelType: '',
    engineNumber: '',
    chassisNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useToastAlert(message, {
    status: isError ? 'error' : 'success',
    title: isError ? 'Vehicle registration failed' : 'Vehicle registered',
    idPrefix: 'vehicle-register',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: name === 'vehicleNumber' ? value.toUpperCase() : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);
    setIsError(false);

    try {
      const response = await registerVehicle(formData);
      setMessage(response?.message || 'Vehicle registered successfully.');
      setFormData({
        vehicleNumber: '',
        vehicleType: '',
        fuelType: '',
        engineNumber: '',
        chassisNumber: '',
      });

      setTimeout(() => {
        navigate(user?.role === 'station_operator' ? '/o-home' : '/vehicleHome', { replace: true });
      }, 900);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Vehicle registration failed.'));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="two-column-grid">
        <Panel eyebrow="New Vehicle" title="Register a vehicle" description="Create a vehicle record for the quota and QR workflow.">
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Vehicle Number</span>
              <input name="vehicleNumber" value={formData.vehicleNumber} onChange={handleChange} placeholder="ABC 1234" required />
            </label>

            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>Vehicle Type</span>
                <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} required>
                  <option value="">Select vehicle type</option>
                  <option value="car">Car</option>
                  <option value="bike">Motorcycle</option>
                  <option value="truck">Truck</option>
                  <option value="bus">Bus</option>
                </select>
              </label>

              <label className="form-field">
                <span>Fuel Type</span>
                <select name="fuelType" value={formData.fuelType} onChange={handleChange} required>
                  <option value="">Select fuel type</option>
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                </select>
              </label>
            </div>

            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>Engine Number</span>
                <input name="engineNumber" value={formData.engineNumber} onChange={handleChange} placeholder="Optional if already in registry" />
              </label>

              <label className="form-field">
                <span>Chassis Number</span>
                <input name="chassisNumber" value={formData.chassisNumber} onChange={handleChange} placeholder="Optional if already in registry" />
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register Vehicle'}
            </button>
          </form>
        </Panel>

        <Panel eyebrow="Registry Rules" title="What happens after submit" description="The backend validates registry information before the vehicle can be used.">
          <div className="detail-stack">
            <KeyValue label="Registry match" value="Existing registry records are used immediately" />
            <KeyValue label="Missing registry entry" value="Engine and chassis values are required" />
            <KeyValue label="Approval step" value="Admin review is required for unverified registry entries" />
            <KeyValue label="Quota assignment" value="Quota is created automatically after registration" />
          </div>
        </Panel>
      </section>
    </div>
  );
};

export const VehicleLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load vehicle logs',
    idPrefix: 'vehicle-logs-error',
  });

  useEffect(() => {
    let active = true;

    const loadLogs = async () => {
      try {
        const data = await getVehicleLogs();
        if (active) {
          setLogs(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load vehicle logs.'));
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
        <MetricCard tone="blue" label="Transactions" value={compactNumber(logs.length)} note="Logged vehicle fueling events" />
        <MetricCard tone="teal" label="Total Litres" value={formatFuel(totalLitres)} note="Cumulative usage" />
        <MetricCard tone="amber" label="Stations" value={compactNumber(new Set(logs.map((log) => log.stationName)).size)} note="Different stations visited" />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Fueling Trend" title="Last seven days" description="Rolling daily total from your transaction history.">
          <div className="chart-frame">
            <Line
              data={{
                labels: dailySeries.map((item) => item.label),
                datasets: [
                  {
                    label: 'Litres pumped',
                    data: dailySeries.map((item) => item.litres),
                    borderColor: chartColors.blue,
                    backgroundColor: chartColors.blueSoft,
                    fill: true,
                    tension: 0.35,
                  },
                ],
              }}
              options={baseChartOptions}
            />
          </div>
        </Panel>

        <Panel eyebrow="Log Detail" title="Transaction history" description="Latest station transactions for your vehicles.">
          {isLoading ? (
            <EmptyState title="Loading logs" description="Fetching the latest transaction history." />
          ) : logs.length === 0 ? (
            <EmptyState title="No logs found" description="History will appear after the first fueling transaction." />
          ) : (
            <div className="table-container">
              <table className="app-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Station</th>
                    <th>Vehicle</th>
                    <th>Fuel</th>
                    <th>Litres</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td data-label="Date">{formatDateTime(log.date)}</td>
                      <td data-label="Station">{log.stationName}</td>
                      <td data-label="Vehicle">{log.vehicleNumber || 'N/A'}</td>
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

export const VehicleRecordIndexPage = () => {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load vehicle records',
    idPrefix: 'vehicle-record-index-error',
  });

  useEffect(() => {
    let active = true;

    const loadVehicles = async () => {
      try {
        const data = await getMyVehicles();

        if (!active) {
          return;
        }

        const nextVehicles = Array.isArray(data) ? data : [];
        setVehicles(nextVehicles);

        if (nextVehicles[0]?._id) {
          navigate(`/vehicle/${nextVehicles[0]._id}`, { replace: true });
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load your registered vehicles.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadVehicles();

    return () => {
      active = false;
    };
  }, [navigate]);

  if (isLoading) {
    return <EmptyState title="Loading vehicle records" description="Fetching your registered vehicles." />;
  }

  if (error) {
    return <EmptyState title="Vehicle records unavailable" description={error} />;
  }

  if (vehicles.length === 0) {
    return (
      <EmptyState
        title="No vehicles connected yet"
        description="Vehicle records will appear here after a vehicle is registered under this account."
      />
    );
  }

  return <EmptyState title="Opening vehicle record" description="Redirecting to your latest registered vehicle." />;
};

export const VehicleDetailsPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useSession();
  const [vehicle, setVehicle] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isVehicleListLoading, setIsVehicleListLoading] = useState(true);
  const [vehicleListError, setVehicleListError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const qrWrapperRef = useRef(null);
  const canSelectOwnedVehicles = SELF_SERVICE_VEHICLE_ROLES.has(user?.role);

  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load vehicle details',
    idPrefix: 'vehicle-details-error',
  });

  useEffect(() => {
    let active = true;

    const loadVehicle = async () => {
      try {
        const data = await getVehicleById(id);
        if (active) {
          setVehicle(data);
        }
      } catch (error) {
        if (active) {
          setError(getErrorMessage(error, 'Failed to load the vehicle record.'));
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadVehicle();

    return () => {
      active = false;
    };
  }, [id]);

  useEffect(() => {
    if (!canSelectOwnedVehicles) {
      setVehicles([]);
      setVehicleListError('');
      setIsVehicleListLoading(false);
      return undefined;
    }

    let active = true;

    const loadVehicles = async () => {
      setIsVehicleListLoading(true);
      setVehicleListError('');

      try {
        const data = await getMyVehicles();

        if (!active) {
          return;
        }

        setVehicles(Array.isArray(data) ? data : []);
      } catch (error) {
        if (active) {
          setVehicles([]);
          setVehicleListError(getErrorMessage(error, 'Failed to load your registered vehicles.'));
        }
      } finally {
        if (active) {
          setIsVehicleListLoading(false);
        }
      }
    };

    loadVehicles();

    return () => {
      active = false;
    };
  }, [canSelectOwnedVehicles, user?._id]);

  useEffect(() => {
    if (!canSelectOwnedVehicles || isVehicleListLoading || vehicles.length === 0) {
      return;
    }

    const vehicleExistsInList = vehicles.some((vehicleItem) => vehicleItem._id === id);
    if (!vehicleExistsInList) {
      navigate(`/vehicle/${vehicles[0]._id}`, { replace: true });
    }
  }, [canSelectOwnedVehicles, id, isVehicleListLoading, navigate, vehicles]);

  const handleDownloadQr = () => {
    if (!vehicle?.qrCode) {
      return;
    }

    if (vehicle.qrCode.startsWith('data:image')) {
      const link = document.createElement('a');
      link.href = vehicle.qrCode;
      link.download = `vehicle-${vehicle.vehicleNumber || 'qr'}.png`;
      link.click();
      return;
    }

    const canvas = qrWrapperRef.current?.querySelector('canvas');
    if (!canvas) {
      return;
    }

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `vehicle-${vehicle.vehicleNumber || 'qr'}.png`;
    link.click();
  };

  const handleVehicleSelectionChange = (nextVehicleId) => {
    if (!nextVehicleId || nextVehicleId === id) {
      return;
    }

    navigate(`/vehicle/${nextVehicleId}`);
  };

  if (isLoading) {
    return <EmptyState title="Loading vehicle record" description="Fetching details, quota balance, and QR information." />;
  }

  if (error) {
    return <EmptyState title="Vehicle unavailable" description="The vehicle details could not be loaded." />;
  }

  if (!vehicle) {
    return <EmptyState title="Vehicle unavailable" description="The requested vehicle could not be found." />;
  }

  const status = getVehicleStatus(vehicle);
  const remainingQuota = Number(vehicle.remainingQuota || 0);
  const allocatedQuota = Number(vehicle.allocatedQuota || 0);
  const usedQuota = Number(vehicle.usedQuota ?? Math.max(allocatedQuota - remainingQuota, 0));
  const quotaTotal = Math.max(allocatedQuota, remainingQuota + usedQuota, 0);
  const remainingShare = quotaTotal > 0 ? Math.round((remainingQuota / quotaTotal) * 100) : 0;
  const usedShare = quotaTotal > 0 ? Math.round((usedQuota / quotaTotal) * 100) : 0;
  const approvalNote = vehicle.approvalNote
    || (status === 'approved'
      ? 'Vehicle approved by admin review.'
      : status === 'rejected'
        ? 'This vehicle is currently rejected.'
        : 'Awaiting admin review.');
  const reviewedAt = vehicle.reviewedAt ? formatDateTime(vehicle.reviewedAt) : status === 'pending' ? 'Not reviewed yet' : 'N/A';
  const qrValue = vehicle.qrCode || vehicle.vehicleNumber || '';
  const isStoredQrImage = typeof qrValue === 'string' && qrValue.startsWith('data:image');
  const hasQuotaData = quotaTotal > 0;
  const selectedVehicleId = vehicles.some((vehicleItem) => vehicleItem._id === id) ? id : '';

  return (
    <div className="page-stack">
      {canSelectOwnedVehicles ? (
        <Panel
          eyebrow="My Vehicles"
          title="Choose vehicle"
          description="Select from the vehicles registered under this account."
          className="vehicle-switcher-panel"
        >
          {isVehicleListLoading ? (
            <p className="subtle-copy">Loading registered vehicles...</p>
          ) : vehicleListError ? (
            <div className="form-banner form-banner--error">{vehicleListError}</div>
          ) : vehicles.length === 0 ? (
            <EmptyState
              title="No vehicles connected yet"
              description="Vehicle records will appear here after a vehicle is registered under this account."
            />
          ) : (
            <div className="vehicle-switcher-row">
              <div className="form-field vehicle-switcher-field">
                <span>Registered vehicles</span>
                <VehiclePicker
                  vehicles={vehicles}
                  selectedVehicleId={selectedVehicleId}
                  onSelect={handleVehicleSelectionChange}
                />
              </div>

              <div className="vehicle-switcher-summary">
                <span className="text-chip">{vehicles.length} registered</span>
                <StatusPill status={status} />
              </div>
            </div>
          )}
        </Panel>
      ) : null}

      <section className="hero-metrics-grid">
        <MetricCard tone="blue" label="Vehicle" value={vehicle.vehicleNumber} note={formatStatus(vehicle.vehicleType)} />
        <MetricCard tone="teal" label="Remaining Quota" value={formatFuel(remainingQuota)} note="Available right now" />
        <MetricCard tone="amber" label="Allocated Quota" value={formatFuel(allocatedQuota)} note="Current cycle allocation" />
        <MetricCard tone="rose" label="Status" value={formatStatus(status)} note="Admin approval status" />
      </section>

      <section className="two-column-grid vehicle-detail-grid">
        <Panel
          eyebrow="Vehicle Detail"
          title="Record summary"
          description="Approval state, quota numbers, and admin review notes."
          className="vehicle-summary-panel"
        >
          <div className="detail-stack vehicle-summary-stack">
            <KeyValue label="Fuel Type" value={formatStatus(vehicle.fuelType)} />
            <KeyValue label="Vehicle Type" value={formatStatus(vehicle.vehicleType)} />
            <KeyValue label="Approval State" value={formatStatus(status)} />
            <KeyValue label="Remaining Quota" value={formatFuel(remainingQuota)} />
            <KeyValue label="Used Quota" value={formatFuel(usedQuota)} />
            <KeyValue label="Admin Note" value={approvalNote} />
            <KeyValue label="Reviewed At" value={reviewedAt} />
          </div>

          <div className="vehicle-quota-shell">
            <div className="chart-frame chart-frame--compact vehicle-detail-chart">
              <Doughnut
                data={{
                  labels: hasQuotaData ? ['Remaining quota', 'Used quota'] : ['No quota assigned'],
                  datasets: [
                    {
                      data: hasQuotaData ? [remainingQuota, usedQuota] : [1],
                      backgroundColor: hasQuotaData ? [chartColors.teal, chartColors.amber] : ['rgba(65, 82, 97, 0.18)'],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  cutout: '74%',
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      enabled: hasQuotaData,
                    },
                  },
                }}
              />
            </div>

            <div className="vehicle-quota-stats">
              <div className="vehicle-quota-stat">
                <span className="vehicle-quota-stat-swatch vehicle-quota-stat-swatch--remaining" aria-hidden="true" />
                <div className="vehicle-quota-stat-copy">
                  <span>Remaining</span>
                  <strong>{formatFuel(remainingQuota)}</strong>
                  <p>{hasQuotaData ? `${remainingShare}% of the current allocation is still available.` : 'No quota assigned yet.'}</p>
                </div>
              </div>

              <div className="vehicle-quota-stat">
                <span className="vehicle-quota-stat-swatch vehicle-quota-stat-swatch--used" aria-hidden="true" />
                <div className="vehicle-quota-stat-copy">
                  <span>Used</span>
                  <strong>{formatFuel(usedQuota)}</strong>
                  <p>{hasQuotaData ? `${usedShare}% of the current allocation has been dispensed.` : 'Usage starts after the first approved transaction.'}</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          eyebrow="QR Access"
          title="Vehicle QR"
          description="Approved vehicles can download the QR used by station users at the pump."
          className="vehicle-qr-panel"
        >
          {status !== 'approved' ? (
            <EmptyState title="QR unavailable" description="The QR becomes active after the vehicle is approved by an admin." />
          ) : (
            <div className="vehicle-qr-stack">
              <div className="vehicle-qr-stage">
                <div className="vehicle-qr-card" ref={qrWrapperRef}>
                  {isStoredQrImage ? (
                    <img src={qrValue} alt={`QR for ${vehicle.vehicleNumber}`} className="qr-image vehicle-qr-image" />
                  ) : (
                    <QRCodeCanvas value={qrValue} size={220} includeMargin level="M" />
                  )}
                </div>
              </div>

              <div className="vehicle-qr-caption">
                <strong>Ready for station scan</strong>
                <p>Download or present this code when fueling vehicle {vehicle.vehicleNumber}.</p>
              </div>

              <button type="button" className="primary-button vehicle-qr-download" onClick={handleDownloadQr}>
                Download QR
              </button>
            </div>
          )}
        </Panel>
      </section>
    </div>
  );
};
