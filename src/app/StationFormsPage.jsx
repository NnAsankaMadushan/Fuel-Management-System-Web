import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createStationOperator, getMyStations, registerStation } from '../api/api';
import { EmptyState, getErrorMessage, getStationStatus, KeyValue, Panel, StatusPill } from './ProtectedShared';
import { useToastAlert } from './appToast';

export const StationRegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    stationName: '',
    location: '',
    station_regNumber: '',
    availablePetrol: '',
    availableDiesel: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useToastAlert(message, {
    status: isError ? 'error' : 'success',
    title: isError ? 'Station registration failed' : 'Station registered',
    idPrefix: 'station-register',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);
    setIsError(false);

    try {
      const payload = {
        ...formData,
        availablePetrol: formData.availablePetrol || undefined,
        availableDiesel: formData.availableDiesel || undefined,
      };
      const response = await registerStation(payload);
      setMessage(response?.message || 'Station registered successfully and is pending admin approval.');
      setTimeout(() => {
        navigate('/s-home', { replace: true });
      }, 900);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Station registration failed.'));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="two-column-grid">
        <Panel eyebrow="Station Setup" title="Register a new station" description="Create the station record and optionally seed the starting fuel stock.">
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>Station Name</span>
              <input name="stationName" value={formData.stationName} onChange={handleChange} required />
            </label>

            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>Location</span>
                <input name="location" value={formData.location} onChange={handleChange} required />
              </label>
              <label className="form-field">
                <span>Registration Number</span>
                <input name="station_regNumber" value={formData.station_regNumber} onChange={handleChange} required />
              </label>
            </div>

            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>Opening Petrol (L)</span>
                <input name="availablePetrol" value={formData.availablePetrol} onChange={handleChange} placeholder="Optional" />
              </label>
              <label className="form-field">
                <span>Opening Diesel (L)</span>
                <input name="availableDiesel" value={formData.availableDiesel} onChange={handleChange} placeholder="Optional" />
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register Station'}
            </button>
          </form>
        </Panel>

        <Panel eyebrow="Result" title="What unlocks next" description="A registered station enables the rest of the owner workflow.">
          <div className="detail-stack">
            <KeyValue label="Approval status" value="Admin review is required before station operations unlock" />
            <KeyValue label="Operator creation" value="Enabled after at least one station is approved" />
            <KeyValue label="Fuel stock updates" value="Available after admin approval" />
            <KeyValue label="QR transaction flow" value="Runs only for approved stations" />
          </div>
        </Panel>
      </section>
    </div>
  );
};

export const CreateOperatorPage = () => {
  const navigate = useNavigate();
  const [stations, setStations] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    nicNumber: '',
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const approvedStations = stations.filter((station) => getStationStatus(station) === 'approved');

  useToastAlert(message, {
    status: isError ? 'error' : 'success',
    title: isError ? 'Operator creation failed' : 'Operator created',
    idPrefix: 'create-operator',
  });

  useEffect(() => {
    let active = true;

    const loadStations = async () => {
      try {
        const data = await getMyStations();
        if (active) {
          setStations(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (active) {
          setStations([]);
          setMessage(getErrorMessage(error, 'Unable to verify station ownership.'));
          setIsError(true);
        }
      } finally {
        if (active) {
          setIsChecking(false);
        }
      }
    };

    loadStations();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

    if (stations.length === 0) {
      setMessage('Register a station before creating operators.');
      setIsError(true);
      return;
    }

    if (approvedStations.length === 0) {
      setMessage('Wait for admin approval before creating operators.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const response = await createStationOperator(formData);
      setMessage(response?.message || 'Operator created successfully.');
      setTimeout(() => {
        navigate('/s-home', { replace: true });
      }, 1000);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to create station operator.'));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="two-column-grid">
        <Panel eyebrow="Operator Access" title="Create station operator" description="Provision the account used on the forecourt for scanning and transactions.">
          <form className="stack-form" onSubmit={handleSubmit}>
            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>Full Name</span>
                <input name="name" value={formData.name} onChange={handleChange} required />
              </label>
              <label className="form-field">
                <span>Phone Number</span>
                <input name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
              </label>
            </div>

            <label className="form-field">
              <span>Email</span>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </label>

            <div className="form-grid form-grid--2">
              <label className="form-field">
                <span>NIC Number</span>
                <input name="nicNumber" value={formData.nicNumber} onChange={handleChange} required />
              </label>
              <label className="form-field">
                <span>Temporary Password</span>
                <input type="password" name="password" value={formData.password} onChange={handleChange} required />
              </label>
            </div>

            <button type="submit" className="primary-button" disabled={isLoading || isChecking || approvedStations.length === 0}>
              {isLoading ? 'Creating Operator...' : 'Create Operator'}
            </button>
          </form>
        </Panel>

        <Panel eyebrow="Station Context" title="Provisioning requirements" description="Operators are always attached to a station owner scope.">
          {isChecking ? (
            <EmptyState title="Checking station access" description="Confirming whether your account already owns a station." />
          ) : stations.length === 0 ? (
            <EmptyState title="No station found" description="Register a station first. Operator creation is blocked until then." />
          ) : approvedStations.length === 0 ? (
            <EmptyState title="Approval pending" description="Admin approval is required before operator creation is enabled." />
          ) : (
            <div className="compact-list">
              {stations.map((station) => (
                <div key={station._id} className="compact-list-item">
                  <div>
                    <strong>{station.stationName}</strong>
                    <p>{station.location}</p>
                  </div>
                  <div className="compact-list-meta">
                    <StatusPill status={getStationStatus(station)} />
                    <span className="text-chip">{station.station_regNumber}</span>
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
