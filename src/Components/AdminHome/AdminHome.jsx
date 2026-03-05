import { useCallback, useEffect, useState } from 'react';
import Header from '../Header/Header';
import Footer from '../footer/footer';
import { createStationOwnerByAdmin, updateVehicleApproval } from '../../api/api';
import './AdminHome.css';

const getVehicleStatus = (vehicle) => vehicle?.verificationStatus || (vehicle?.isVerified ? 'approved' : 'pending');
const getRecordTime = (item) => {
  const createdTime = new Date(item?.createdAt || item?.updatedAt || '').getTime();
  return Number.isFinite(createdTime) ? createdTime : 0;
};
const sortNewestFirst = (items = []) => [...items].sort((a, b) => getRecordTime(b) - getRecordTime(a));

const formatVehicleStatus = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
};

const getStatusClassName = (status) => `status-chip status-chip--${String(status || 'pending').toLowerCase()}`;
const initialStationOwnerForm = {
  name: '',
  email: '',
  password: '',
  phoneNumber: '',
  nicNumber: '',
};

export const AdminHome = () => {
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [activeTab, setActiveTab] = useState('Vehicles');
  const [details, setDetails] = useState(null);
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [recordSearchTerm, setRecordSearchTerm] = useState('');
  const [stationOwnerForm, setStationOwnerForm] = useState(initialStationOwnerForm);
  const [isCreatingOwner, setIsCreatingOwner] = useState(false);

  const setBanner = useCallback((message, error = false) => {
    setResponseMessage(message);
    setIsError(error);
  }, []);

  const handleStationOwnerFieldChange = (event) => {
    const { name, value } = event.target;
    setStationOwnerForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const resetStationOwnerForm = () => {
    setStationOwnerForm(initialStationOwnerForm);
  };

  const handleCreateStationOwner = async (event) => {
    event.preventDefault();

    const payload = {
      name: stationOwnerForm.name.trim(),
      email: stationOwnerForm.email.trim(),
      password: stationOwnerForm.password,
      phoneNumber: stationOwnerForm.phoneNumber.trim(),
      nicNumber: stationOwnerForm.nicNumber.trim(),
    };

    if (Object.values(payload).some((value) => !value)) {
      setBanner('All station owner fields are required.', true);
      return;
    }

    setIsCreatingOwner(true);
    setResponseMessage('');

    try {
      const data = await createStationOwnerByAdmin(payload);
      setBanner(data.message || 'Station owner account created successfully.');
      resetStationOwnerForm();
    } catch (error) {
      console.error('Error creating station owner:', error);
      setBanner(error.response?.data?.message || 'Failed to create station owner account.', true);
    } finally {
      setIsCreatingOwner(false);
    }
  };

  const fetchVehicles = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }

      const data = await response.json();
      setVehicles(sortNewestFirst(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setBanner('Failed to load vehicle records.', true);
    }
  }, [setBanner]);

  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stations`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      const data = await response.json();
      setStations(sortNewestFirst(Array.isArray(data) ? data : []));
    } catch (error) {
      console.error('Error fetching stations:', error);
      setBanner('Failed to load station records.', true);
    }
  }, [setBanner]);

  useEffect(() => {
    fetchVehicles();
    fetchStations();
  }, [fetchVehicles, fetchStations]);

  const showDetails = async (id) => {
    const url =
      activeTab === 'Vehicles'
        ? `${import.meta.env.VITE_API_URL}/api/vehicles/${id}`
        : `${import.meta.env.VITE_API_URL}/api/stations/${id}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      if (!response.ok) throw new Error(`Error: ${response.statusText}`);
      const data = await response.json();
      setDetails(data);
    } catch (error) {
      console.error('Error fetching details:', error);
      setBanner('Failed to load record details.', true);
    }
  };

  const handleVehicleReview = async (vehicle, status) => {
    const currentStatus = getVehicleStatus(vehicle);
    if (currentStatus === status) {
      setBanner(`Vehicle is already ${status}.`);
      return;
    }

    const confirmationMessage =
      status === 'approved'
        ? `Approve vehicle ${vehicle.vehicleNumber}?`
        : `Reject vehicle ${vehicle.vehicleNumber}?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    let note = '';
    if (status === 'rejected') {
      const promptValue = window.prompt(
        'Enter a rejection reason for the vehicle owner (optional):',
        vehicle.approvalNote || ''
      );

      if (promptValue === null) {
        return;
      }

      note = promptValue.trim();
    }

    setIsSubmittingDecision(true);
    setResponseMessage('');

    try {
      const data = await updateVehicleApproval(vehicle._id, { status, note });
      await fetchVehicles();

      if (details?._id === vehicle._id) {
        setDetails(data.vehicle);
      }

      setBanner(data.message || `Vehicle ${status} successfully.`);
    } catch (error) {
      console.error('Error updating vehicle approval:', error);
      setBanner(error.response?.data?.message || 'Failed to update vehicle approval.', true);
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const deleteItem = async (id) => {
    const url =
      activeTab === 'Vehicles'
        ? `${import.meta.env.VITE_API_URL}/api/vehicles/${id}`
        : `${import.meta.env.VITE_API_URL}/api/stations/${id}`;

    if (!window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    try {
      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorMessage = await response.json();
        throw new Error(`Error: ${response.status} - ${errorMessage.message || response.statusText}`);
      }

      if (details?._id === id) {
        setDetails(null);
      }

      if (activeTab === 'Vehicles') {
        await fetchVehicles();
      } else {
        await fetchStations();
      }

      setBanner(`${activeTab === 'Vehicles' ? 'Vehicle' : 'Station'} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting item:', error);
      setBanner(`Error deleting item: ${error.message}`, true);
    }
  };

  const currentData = activeTab === 'Vehicles' ? vehicles : stations;
  const searchQuery = recordSearchTerm.trim().toLowerCase();
  const filteredData = currentData.filter((item) => {
    if (!searchQuery) {
      return true;
    }

    if (activeTab === 'Vehicles') {
      const searchableValues = [
        item.vehicleNumber,
        item.vehicleType,
        item.fuelType,
        item.vehicleOwnerName,
        item.vehicleOwner?.name,
        getVehicleStatus(item),
      ];

      return searchableValues.some((value) => String(value || '').toLowerCase().includes(searchQuery));
    }

    const searchableValues = [
      item.stationName,
      item.location,
      item.station_regNumber,
      item.fuelStationOwner?.name,
    ];

    return searchableValues.some((value) => String(value || '').toLowerCase().includes(searchQuery));
  });
  const totalOperators = stations.reduce((sum, station) => sum + (station.stationOperators?.length || 0), 0);
  const totalRegistrations = stations.length + vehicles.length;
  const registrationRings = [
    { key: 'stations', label: 'Fuel Stations', value: stations.length, className: 'admin-ring-card--stations' },
    { key: 'vehicles', label: 'Vehicles', value: vehicles.length, className: 'admin-ring-card--vehicles' },
  ];

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell page-shell--wide">
        <section className="admin-hero panel rise-in">
          <div className="admin-hero-copy">
            <span className="section-badge">Admin</span>
            <h1>Review vehicles and stations.</h1>
            <p className="lead-text">Approve or reject vehicle requests, inspect records, and remove invalid entries.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Vehicles</div>
              <div className="metric-value">{vehicles.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Stations</div>
              <div className="metric-value">{stations.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pending vehicles</div>
              <div className="metric-value">
                {vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'pending').length}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Operators</div>
              <div className="metric-value">{totalOperators}</div>
            </div>
          </div>
        </section>

        {responseMessage ? (
          <section className="page-section">
            <div className={`response-banner ${isError ? 'error-banner' : ''}`}>{responseMessage}</div>
          </section>
        ) : null}

        <section className="page-section panel admin-owner-panel">
          <div className="section-heading">
            <div>
              <span className="section-badge">Accounts</span>
              <h2>Create station owner</h2>
            </div>
          </div>

          <form className="app-form admin-owner-form" onSubmit={handleCreateStationOwner}>
            <div className="field-grid admin-owner-grid">
              <label className="field-group">
                <span>Full name</span>
                <input
                  type="text"
                  name="name"
                  placeholder="Station owner name"
                  value={stationOwnerForm.name}
                  onChange={handleStationOwnerFieldChange}
                  required
                />
              </label>

              <label className="field-group">
                <span>Email address</span>
                <input
                  type="email"
                  name="email"
                  placeholder="owner@example.com"
                  value={stationOwnerForm.email}
                  onChange={handleStationOwnerFieldChange}
                  required
                />
              </label>

              <label className="field-group">
                <span>Phone number</span>
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="0771234567"
                  value={stationOwnerForm.phoneNumber}
                  onChange={handleStationOwnerFieldChange}
                  required
                />
              </label>

              <label className="field-group">
                <span>NIC number</span>
                <input
                  type="text"
                  name="nicNumber"
                  placeholder="200012345678 or 123456789V"
                  value={stationOwnerForm.nicNumber}
                  onChange={handleStationOwnerFieldChange}
                  required
                />
              </label>
            </div>

            <label className="field-group">
              <span>Temporary password</span>
              <input
                type="password"
                name="password"
                placeholder="Set an initial password"
                value={stationOwnerForm.password}
                onChange={handleStationOwnerFieldChange}
                required
              />
            </label>

            <div className="admin-owner-actions">
              <button type="submit" className="button" disabled={isCreatingOwner}>
                {isCreatingOwner ? 'Creating station owner...' : 'Create Station Owner'}
              </button>
            </div>
          </form>
        </section>

        <section className="page-section">
          <div className="chart-panel panel">
            <div className="section-heading">
              <div>
                <span className="section-badge">Summary</span>
                <h2>Registrations</h2>
              </div>
            </div>
            <div className="admin-ring-grid">
              {registrationRings.map((ring) => (
                <div key={ring.key} className={`admin-ring-card ${ring.className}`}>
                  <div className="admin-ring-meter" aria-label={`${ring.label}: ${ring.value}`}>
                    <span className="admin-ring-value">{ring.value}</span>
                  </div>
                  <div className="admin-ring-copy">
                    <span className="metric-label">{ring.label}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="admin-ring-total">
              <span className="metric-label">Total registrations</span>
              <strong>{totalRegistrations}</strong>
            </div>
          </div>
        </section>

        <section className="page-section panel admin-table-panel">
          <div className="section-heading">
            <div>
              <span className="section-badge">Records</span>
              <h2>{activeTab}</h2>
            </div>

            <div className="admin-record-controls">
              <div className="tab-container">
                <button
                  type="button"
                  className={`tab-button ${activeTab === 'Vehicles' ? 'tab-button--active' : ''}`}
                  onClick={() => {
                    setActiveTab('Vehicles');
                    setRecordSearchTerm('');
                  }}
                >
                  Vehicles
                </button>
                <button
                  type="button"
                  className={`tab-button ${activeTab === 'Stations' ? 'tab-button--active' : ''}`}
                  onClick={() => {
                    setActiveTab('Stations');
                    setRecordSearchTerm('');
                  }}
                >
                  Stations
                </button>
              </div>

              <label className="admin-search-field">
                <input
                  type="text"
                  value={recordSearchTerm}
                  onChange={(event) => setRecordSearchTerm(event.target.value)}
                  placeholder={
                    activeTab === 'Vehicles'
                      ? 'Search vehicle number, type, owner, status...'
                      : 'Search station name, location, reg number...'
                  }
                />
              </label>
            </div>
          </div>

          <div className="table-shell">
            {filteredData.length === 0 ? (
              <div className="empty-state">No {activeTab.toLowerCase()} found.</div>
            ) : (
              <table className="app-table">
                <thead>
                  <tr>
                    <th>{activeTab === 'Vehicles' ? 'Vehicle Number' : 'Station Name'}</th>
                    <th>{activeTab === 'Vehicles' ? 'Vehicle Type' : 'Location'}</th>
                    {activeTab === 'Vehicles' ? <th>Status</th> : null}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item) => {
                    const vehicleStatus = getVehicleStatus(item);

                    return (
                      <tr key={item._id}>
                        <td data-label={activeTab === 'Vehicles' ? 'Vehicle Number' : 'Station Name'}>
                          {activeTab === 'Vehicles' ? item.vehicleNumber || 'N/A' : item.stationName || 'N/A'}
                        </td>
                        <td data-label={activeTab === 'Vehicles' ? 'Vehicle Type' : 'Location'}>
                          {activeTab === 'Vehicles' ? item.vehicleType || 'N/A' : item.location || 'N/A'}
                        </td>
                        {activeTab === 'Vehicles' ? (
                          <td data-label="Status">
                            <span className={getStatusClassName(vehicleStatus)}>{formatVehicleStatus(vehicleStatus)}</span>
                          </td>
                        ) : null}
                        <td data-label="Actions">
                          <div className="table-actions">
                            <button type="button" className="secondary-button" onClick={() => showDetails(item._id)}>
                              Details
                            </button>

                            {activeTab === 'Vehicles' ? (
                              <>
                                <button
                                  type="button"
                                  className="button"
                                  disabled={isSubmittingDecision || vehicleStatus === 'approved'}
                                  onClick={() => handleVehicleReview(item, 'approved')}
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  className="danger-button"
                                  disabled={isSubmittingDecision || vehicleStatus === 'rejected'}
                                  onClick={() => handleVehicleReview(item, 'rejected')}
                                >
                                  Reject
                                </button>
                              </>
                            ) : null}

                            <button type="button" className="danger-button" onClick={() => deleteItem(item._id)}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {details ? (
          <div className="modal" onClick={() => setDetails(null)} role="presentation">
            <div className="modal-content admin-modal" onClick={(event) => event.stopPropagation()}>
              <div className="admin-modal-header">
                <div>
                  <span className="section-badge">Details</span>
                  <h2>{activeTab === 'Vehicles' ? 'Vehicle' : 'Station'}</h2>
                </div>
                <button type="button" className="ghost-button" onClick={() => setDetails(null)}>
                  Close
                </button>
              </div>

              {activeTab === 'Vehicles' ? (
                <>
                  <div className="details-stack">
                    <div className="info-item">
                      <strong>Vehicle Number</strong>
                      <p>{details.vehicleNumber || 'N/A'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Vehicle Type</strong>
                      <p>{details.vehicleType || 'N/A'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Status</strong>
                      <p>
                        <span className={getStatusClassName(getVehicleStatus(details))}>
                          {formatVehicleStatus(getVehicleStatus(details))}
                        </span>
                      </p>
                    </div>
                    <div className="info-item">
                      <strong>Owner</strong>
                      <p>{details.vehicleOwnerName || details.vehicleOwner?.name || 'Unavailable'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Decision note</strong>
                      <p>{details.approvalNote || 'No admin note added.'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Reviewed</strong>
                      <p>{details.reviewedAt ? new Date(details.reviewedAt).toLocaleString() : 'Not reviewed yet'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Reviewed by</strong>
                      <p>{details.reviewedBy?.name || 'System / registry'}</p>
                    </div>
                    <div className="info-item">
                      <strong>Registered</strong>
                      <p>{details.createdAt ? new Date(details.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>

                  <div className="table-actions admin-detail-actions">
                    <button
                      type="button"
                      className="button"
                      disabled={isSubmittingDecision || getVehicleStatus(details) === 'approved'}
                      onClick={() => handleVehicleReview(details, 'approved')}
                    >
                      Approve vehicle
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={isSubmittingDecision || getVehicleStatus(details) === 'rejected'}
                      onClick={() => handleVehicleReview(details, 'rejected')}
                    >
                      Reject vehicle
                    </button>
                  </div>
                </>
              ) : (
                <div className="details-stack">
                  <div className="info-item">
                    <strong>Station Name</strong>
                    <p>{details.stationName || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <strong>Location</strong>
                    <p>{details.location || 'N/A'}</p>
                  </div>
                  <div className="info-item">
                    <strong>Owner</strong>
                    <p>{details.fuelStationOwner?.name || 'Unavailable'}</p>
                  </div>
                  <div className="info-item">
                    <strong>Registered Vehicles</strong>
                    {(details.registeredVehicles || []).length > 0 ? (
                      <div className="registered-vehicle-list">
                        {details.registeredVehicles.map((item) => (
                          <div key={item._id} className="list-row">
                            <strong>{item.vehicle?.vehicleNumber || 'Unavailable'}</strong>
                            <span className="inline-note">
                              {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No vehicles found.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </main>

      <Footer />
    </div>
  );
};

export default AdminHome;
