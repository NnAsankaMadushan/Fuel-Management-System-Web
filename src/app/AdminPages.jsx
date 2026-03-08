import { useCallback, useEffect, useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  createStationOwnerByAdmin,
  deleteStation,
  deleteVehicle,
  getAllStations,
  getAllVehicles,
  getStationById,
  getVehicleById,
  updateStationApproval,
  updateVehicleApproval,
} from '../api/api';
import {
  ActionDialog,
  baseChartOptions,
  buildMonthlySeries,
  chartColors,
  compactNumber,
  EmptyState,
  formatDate,
  formatDateTime,
  formatFuel,
  formatStatus,
  getErrorMessage,
  getStationStatus,
  getVehicleStatus,
  KeyValue,
  MetricCard,
  Panel,
  StatusPill,
  useActionDialog,
} from './ProtectedShared';
import { useToastAlert } from './appToast';

export const AdminConsolePage = ({ view = 'overview' }) => {
  const [vehicles, setVehicles] = useState([]);
  const [stations, setStations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [selectedType, setSelectedType] = useState('vehicle');
  const [feedback, setFeedback] = useState('');
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [ownerForm, setOwnerForm] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    nicNumber: '',
  });
  const {
    actionDialog,
    promptValue,
    setPromptValue,
    closeActionDialog,
    openConfirmDialog,
    openPromptDialog,
  } = useActionDialog();

  useToastAlert(feedback, {
    status: feedbackIsError ? 'error' : 'success',
    title: feedbackIsError ? 'Admin action failed' : 'Admin update',
    idPrefix: 'admin-feedback',
  });
  useToastAlert(error, {
    status: 'error',
    title: 'Unable to load admin data',
    idPrefix: 'admin-error',
  });

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const [vehicleData, stationData] = await Promise.all([getAllVehicles(), getAllStations()]);
      setVehicles(Array.isArray(vehicleData) ? vehicleData : []);
      setStations(Array.isArray(stationData) ? stationData : []);
    } catch (error) {
      setError(getErrorMessage(error, 'Failed to load admin records.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const loadRecordDetail = async (type, id) => {
    setBusyId(id);
    setFeedback('');

    try {
      const data = type === 'vehicle' ? await getVehicleById(id) : await getStationById(id);
      setSelectedType(type);
      setSelectedRecord(data);
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to load record details.'));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const handleVehicleDecision = async (vehicle, status) => {
    const actionLabel = status === 'approved' ? 'approve' : 'reject';
    let note = '';

    if (status === 'approved') {
      const confirmed = await openConfirmDialog({
        eyebrow: 'Vehicle Approval',
        title: `Approve ${vehicle.vehicleNumber}?`,
        message: 'This will activate the vehicle record for quota allocation and QR-based fuel access.',
        confirmLabel: 'Approve vehicle',
        cancelLabel: 'Keep pending',
      });

      if (!confirmed) {
        return;
      }
    } else {
      const enteredNote = await openPromptDialog({
        eyebrow: 'Vehicle Rejection',
        title: `Reject ${vehicle.vehicleNumber}?`,
        message: 'Add an optional note to explain why this vehicle cannot be approved yet.',
        promptLabel: 'Rejection note',
        promptHint: 'Leave this blank if you want to reject the record without an added note.',
        placeholder: 'Explain what needs to be corrected',
        defaultValue: vehicle.approvalNote || '',
        confirmLabel: 'Reject vehicle',
        cancelLabel: 'Back',
        variant: 'danger',
      });

      if (enteredNote === null) {
        return;
      }

      note = enteredNote.trim();
    }

    setFeedback('');
    setBusyId(vehicle._id);

    try {
      const response = await updateVehicleApproval(vehicle._id, { status, note });
      setFeedback(response?.message || `Vehicle ${actionLabel}d successfully.`);
      setFeedbackIsError(false);
      await loadRecords();

      if (selectedType === 'vehicle' && selectedRecord?._id === vehicle._id) {
        setSelectedRecord(response?.vehicle || null);
      }
    } catch (error) {
      setFeedback(getErrorMessage(error, `Failed to ${actionLabel} vehicle.`));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const handleStationDecision = async (station, status) => {
    const actionLabel = status === 'approved' ? 'approve' : 'reject';
    let note = '';

    if (status === 'approved') {
      const confirmed = await openConfirmDialog({
        eyebrow: 'Station Approval',
        title: `Approve ${station.stationName}?`,
        message: 'This will enable station operations, fuel stock updates, and operator workflows for this record.',
        confirmLabel: 'Approve station',
        cancelLabel: 'Keep pending',
      });

      if (!confirmed) {
        return;
      }
    } else {
      const enteredNote = await openPromptDialog({
        eyebrow: 'Station Rejection',
        title: `Reject ${station.stationName}?`,
        message: 'Add an optional note so the station owner knows what needs to be corrected before resubmitting.',
        promptLabel: 'Rejection note',
        promptHint: 'Leave this blank if you want to reject the record without an added note.',
        placeholder: 'Explain what needs to be corrected',
        defaultValue: station.approvalNote || '',
        confirmLabel: 'Reject station',
        cancelLabel: 'Back',
        variant: 'danger',
      });

      if (enteredNote === null) {
        return;
      }

      note = enteredNote.trim();
    }

    setFeedback('');
    setBusyId(station._id);

    try {
      const response = await updateStationApproval(station._id, { status, note });
      setFeedback(response?.message || `Station ${actionLabel}d successfully.`);
      setFeedbackIsError(false);
      await loadRecords();

      if (selectedType === 'station' && selectedRecord?._id === station._id) {
        setSelectedRecord(response?.station || null);
      }
    } catch (error) {
      setFeedback(getErrorMessage(error, `Failed to ${actionLabel} station.`));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const handleDeleteRecord = async (type, record) => {
    const recordLabel = type === 'vehicle' ? record.vehicleNumber : record.stationName;
    const confirmed = await openConfirmDialog({
      eyebrow: type === 'vehicle' ? 'Vehicle Removal' : 'Station Removal',
      title: `Delete ${recordLabel}?`,
      message: `This permanently removes the ${type} record from the admin workspace.`,
      confirmLabel: type === 'vehicle' ? 'Delete vehicle' : 'Delete station',
      cancelLabel: 'Keep record',
      variant: 'danger',
    });

    if (!confirmed) {
      return;
    }

    setFeedback('');
    setBusyId(record._id);

    try {
      if (type === 'vehicle') {
        await deleteVehicle(record._id);
      } else {
        await deleteStation(record._id);
      }

      setFeedback(`${type === 'vehicle' ? 'Vehicle' : 'Station'} deleted successfully.`);
      setFeedbackIsError(false);
      await loadRecords();

      if (selectedRecord?._id === record._id) {
        setSelectedRecord(null);
      }
    } catch (error) {
      setFeedback(getErrorMessage(error, `Failed to delete ${type}.`));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const handleOwnerFormChange = (event) => {
    const { name, value } = event.target;
    setOwnerForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleCreateOwner = async (event) => {
    event.preventDefault();
    setFeedback('');
    setBusyId('owner-create');

    try {
      const response = await createStationOwnerByAdmin(ownerForm);
      setFeedback(response?.message || 'Station owner created successfully.');
      setFeedbackIsError(false);
      setOwnerForm({
        name: '',
        email: '',
        password: '',
        phoneNumber: '',
        nicNumber: '',
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to create station owner.'));
      setFeedbackIsError(true);
    } finally {
      setBusyId('');
    }
  };

  const search = query.trim().toLowerCase();
  const filteredVehicles = vehicles.filter((vehicle) => {
    if (!search) {
      return true;
    }

    return [
      vehicle.vehicleNumber,
      vehicle.vehicleType,
      vehicle.fuelType,
      vehicle.vehicleOwnerName,
      getVehicleStatus(vehicle),
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });

  const filteredStations = stations.filter((station) => {
    if (!search) {
      return true;
    }

    return [
      station.stationName,
      station.location,
      station.station_regNumber,
      station.fuelStationOwner?.name,
      getStationStatus(station),
    ].some((value) => String(value || '').toLowerCase().includes(search));
  });

  const monthlyVehicles = buildMonthlySeries(vehicles);
  const monthlyStations = buildMonthlySeries(stations);
  const vehicleStatusBreakdown = {
    approved: vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'approved').length,
    pending: vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'pending').length,
    rejected: vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'rejected').length,
  };
  const stationStatusBreakdown = {
    approved: stations.filter((station) => getStationStatus(station) === 'approved').length,
    pending: stations.filter((station) => getStationStatus(station) === 'pending').length,
    rejected: stations.filter((station) => getStationStatus(station) === 'rejected').length,
  };
  const approvalStatusLabels = ['Approved', 'Pending', 'Rejected'];
  const approvalStatusColors = [chartColors.teal, chartColors.amber, chartColors.rose];
  const hasVehicleApprovalData = vehicles.length > 0;
  const hasStationApprovalData = stations.length > 0;
  const hasApprovalMixData = hasVehicleApprovalData || hasStationApprovalData;
  const totalOperators = stations.reduce((sum, station) => sum + (station.stationOperators?.length || 0), 0);

  const showOverview = view === 'overview';
  const showVehicles = view === 'overview' || view === 'vehicles';
  const showStations = view === 'overview' || view === 'stations';
  const showOwnerForm = view === 'overview' || view === 'owners';

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="teal" label="Vehicles" value={compactNumber(vehicles.length)} note="All registered vehicle records" />
        <MetricCard tone="violet" label="Stations" value={compactNumber(stations.length)} note="Active station records" />
        <MetricCard
          tone="amber"
          label="Pending Reviews"
          value={compactNumber(vehicleStatusBreakdown.pending + stationStatusBreakdown.pending)}
          note="Vehicle and station approvals waiting for action"
        />
        <MetricCard tone="rose" label="Operators" value={compactNumber(totalOperators)} note="Assigned pump operators across stations" />
      </section>

      {showOverview ? (
        <section className="two-column-grid">
          <Panel eyebrow="System Activity" title="Registration trend" description="Monthly registrations across vehicles and stations.">
            <div className="chart-frame">
              <Bar
                data={{
                  labels: monthlyVehicles.labels,
                  datasets: [
                    {
                      label: 'Vehicles',
                      data: monthlyVehicles.values,
                      borderColor: chartColors.blue,
                      backgroundColor: chartColors.blueSoft,
                      borderWidth: 1.5,
                      borderRadius: 10,
                      maxBarThickness: 24,
                    },
                    {
                      label: 'Stations',
                      data: monthlyStations.values,
                      borderColor: chartColors.teal,
                      backgroundColor: chartColors.tealSoft,
                      borderWidth: 1.5,
                      borderRadius: 10,
                      maxBarThickness: 24,
                    },
                  ],
                }}
                options={{
                  ...baseChartOptions,
                  scales: {
                    ...baseChartOptions.scales,
                    x: {
                      ...baseChartOptions.scales.x,
                      stacked: false,
                    },
                    y: {
                      ...baseChartOptions.scales.y,
                      ticks: {
                        ...baseChartOptions.scales.y.ticks,
                        precision: 0,
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </Panel>

          <Panel
            eyebrow="Approval Mix"
            title="Approval status overview"
            description="Vehicles and stations are shown independently across approved, pending, and rejected records."
          >
            {hasApprovalMixData ? (
              <div className="approval-chart-grid">
                <article className="approval-chart-card">
                  <div className="approval-chart-card-header">
                    <div>
                      <h3>Vehicles</h3>
                      <p>{compactNumber(vehicles.length)} registered records</p>
                    </div>
                  </div>
                  {hasVehicleApprovalData ? (
                    <div className="chart-frame chart-frame--compact">
                      <Doughnut
                        data={{
                          labels: approvalStatusLabels,
                          datasets: [
                            {
                              data: [
                                vehicleStatusBreakdown.approved,
                                vehicleStatusBreakdown.pending,
                                vehicleStatusBreakdown.rejected,
                              ],
                              backgroundColor: approvalStatusColors,
                              borderWidth: 0,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          cutout: '64%',
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                usePointStyle: true,
                                boxWidth: 10,
                                color: '#415261',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.label}: ${context.formattedValue}`,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <div className="approval-chart-empty">No vehicle approvals yet.</div>
                  )}
                </article>

                <article className="approval-chart-card">
                  <div className="approval-chart-card-header">
                    <div>
                      <h3>Stations</h3>
                      <p>{compactNumber(stations.length)} registered records</p>
                    </div>
                  </div>
                  {hasStationApprovalData ? (
                    <div className="chart-frame chart-frame--compact">
                      <Doughnut
                        data={{
                          labels: approvalStatusLabels,
                          datasets: [
                            {
                              data: [
                                stationStatusBreakdown.approved,
                                stationStatusBreakdown.pending,
                                stationStatusBreakdown.rejected,
                              ],
                              backgroundColor: approvalStatusColors,
                              borderWidth: 0,
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          cutout: '64%',
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: {
                                usePointStyle: true,
                                boxWidth: 10,
                                color: '#415261',
                              },
                            },
                            tooltip: {
                              callbacks: {
                                label: (context) => `${context.label}: ${context.formattedValue}`,
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  ) : (
                    <div className="approval-chart-empty">No station approvals yet.</div>
                  )}
                </article>
              </div>
            ) : (
              <EmptyState
                title="No approval records yet"
                description="Vehicle and station registrations will appear here once records are submitted."
              />
            )}
          </Panel>
        </section>
      ) : null}

      {showVehicles ? (
        <section className="two-column-grid two-column-grid--wide">
          <Panel
            eyebrow="Vehicle Review"
            title={view === 'vehicles' ? 'Vehicle review queue' : 'Latest vehicle records'}
            description="Inspect the newest registrations and act on approval requests."
            actions={
              <label className="panel-search">
                <input
                  type="text"
                  placeholder="Search vehicles"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            }
          >
            {isLoading ? (
              <EmptyState title="Loading vehicles" description="Fetching current vehicle records." />
            ) : filteredVehicles.length === 0 ? (
              <EmptyState title="No vehicles found" description="Adjust the search or wait for new registrations." />
            ) : (
              <div className="table-container">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showOverview ? filteredVehicles.slice(0, 5) : filteredVehicles).map((vehicle) => (
                      <tr key={vehicle._id}>
                        <td data-label="Vehicle">
                          <strong>{vehicle.vehicleNumber}</strong>
                          <div className="table-subtext">{formatStatus(vehicle.vehicleType)} • {formatStatus(vehicle.fuelType)}</div>
                        </td>
                        <td data-label="Owner">{vehicle.vehicleOwnerName || 'N/A'}</td>
                        <td data-label="Status">
                          <StatusPill status={getVehicleStatus(vehicle)} />
                        </td>
                        <td data-label="Created">{formatDate(vehicle.createdAt)}</td>
                        <td data-label="Actions">
                          <div className="table-actions table-actions--compact">
                            <button type="button" className="ghost-button" onClick={() => loadRecordDetail('vehicle', vehicle._id)} disabled={busyId === vehicle._id}>
                              Details
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleVehicleDecision(vehicle, 'approved')}
                              disabled={busyId === vehicle._id || getVehicleStatus(vehicle) === 'approved'}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleVehicleDecision(vehicle, 'rejected')}
                              disabled={busyId === vehicle._id || getVehicleStatus(vehicle) === 'rejected'}
                            >
                              Reject
                            </button>
                            <button type="button" className="ghost-button" onClick={() => handleDeleteRecord('vehicle', vehicle)} disabled={busyId === vehicle._id}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Selected Record" title={selectedType === 'vehicle' ? 'Vehicle detail' : 'Station detail'} description="Admin detail view for the currently selected record.">
            {!selectedRecord ? (
              <EmptyState title="Nothing selected" description="Open a record to inspect the full details." />
            ) : selectedType === 'vehicle' ? (
              <div className="detail-stack">
                <KeyValue label="Vehicle Number" value={selectedRecord.vehicleNumber || 'N/A'} />
                <KeyValue label="Owner" value={selectedRecord.vehicleOwnerName || 'N/A'} />
                <KeyValue label="Status" value={formatStatus(getVehicleStatus(selectedRecord))} />
                <KeyValue label="Fuel Type" value={formatStatus(selectedRecord.fuelType)} />
                <KeyValue label="Vehicle Type" value={formatStatus(selectedRecord.vehicleType)} />
                <KeyValue label="Allocated Quota" value={formatFuel(selectedRecord.allocatedQuota)} />
                <KeyValue label="Remaining Quota" value={formatFuel(selectedRecord.remainingQuota)} />
                <KeyValue label="Admin Note" value={selectedRecord.approvalNote || 'No note added'} />
                <KeyValue label="Reviewed At" value={formatDateTime(selectedRecord.reviewedAt)} />
              </div>
            ) : (
              <div className="detail-stack">
                <KeyValue label="Station Name" value={selectedRecord.stationName || 'N/A'} />
                <KeyValue label="Location" value={selectedRecord.location || 'N/A'} />
                <KeyValue label="Registration No." value={selectedRecord.station_regNumber || 'N/A'} />
                <KeyValue label="Owner" value={selectedRecord.fuelStationOwner?.name || 'N/A'} />
                <KeyValue label="Status" value={formatStatus(getStationStatus(selectedRecord))} />
                <KeyValue label="Petrol" value={formatFuel(selectedRecord.availablePetrol)} />
                <KeyValue label="Diesel" value={formatFuel(selectedRecord.availableDiesel)} />
                <KeyValue label="Operators" value={compactNumber(selectedRecord.stationOperators?.length || 0)} />
                <KeyValue label="Registered Vehicles" value={compactNumber(selectedRecord.registeredVehicles?.length || 0)} />
                <KeyValue label="Admin Note" value={selectedRecord.approvalNote || 'No note added'} />
                <KeyValue label="Reviewed At" value={formatDateTime(selectedRecord.reviewedAt)} />
              </div>
            )}
          </Panel>
        </section>
      ) : null}

      {showStations ? (
        <section className="two-column-grid two-column-grid--wide">
          <Panel
            eyebrow="Station Registry"
            title={view === 'stations' ? 'Station records' : 'Latest station records'}
            description="Track coverage, ownership, and staffing across stations."
            actions={
              <label className="panel-search">
                <input
                  type="text"
                  placeholder="Search stations"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            }
          >
            {isLoading ? (
              <EmptyState title="Loading stations" description="Fetching the current station registry." />
            ) : filteredStations.length === 0 ? (
              <EmptyState title="No stations found" description="Adjust the search or add a new station owner first." />
            ) : (
              <div className="table-container">
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Station</th>
                      <th>Owner</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Operators</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showOverview ? filteredStations.slice(0, 5) : filteredStations).map((station) => (
                      <tr key={station._id}>
                        <td data-label="Station">
                          <strong>{station.stationName}</strong>
                          <div className="table-subtext">{station.station_regNumber || 'No registration number'}</div>
                        </td>
                        <td data-label="Owner">{station.fuelStationOwner?.name || 'N/A'}</td>
                        <td data-label="Status">
                          <StatusPill status={getStationStatus(station)} />
                        </td>
                        <td data-label="Location">{station.location || 'N/A'}</td>
                        <td data-label="Operators">{station.stationOperators?.length || 0}</td>
                        <td data-label="Actions">
                          <div className="table-actions table-actions--compact">
                            <button type="button" className="ghost-button" onClick={() => loadRecordDetail('station', station._id)} disabled={busyId === station._id}>
                              Details
                            </button>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleStationDecision(station, 'approved')}
                              disabled={busyId === station._id || getStationStatus(station) === 'approved'}
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              className="danger-button"
                              onClick={() => handleStationDecision(station, 'rejected')}
                              disabled={busyId === station._id || getStationStatus(station) === 'rejected'}
                            >
                              Reject
                            </button>
                            <button type="button" className="ghost-button" onClick={() => handleDeleteRecord('station', station)} disabled={busyId === station._id}>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Coverage" title="Staffing snapshot" description="Current owner and operator assignments by station.">
            {stations.length === 0 ? (
              <EmptyState title="No station coverage" description="Once stations are created, their staffing summary will appear here." />
            ) : (
              <div className="compact-list">
                {stations.slice(0, showOverview ? 5 : stations.length).map((station) => (
                  <div key={station._id} className="compact-list-item">
                    <div>
                      <strong>{station.stationName}</strong>
                      <p>{station.location}</p>
                    </div>
                    <div className="compact-list-meta">
                      <StatusPill status={getStationStatus(station)} />
                      <span>{station.fuelStationOwner?.name || 'No owner'}</span>
                      <strong>{station.stationOperators?.length || 0} operators</strong>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </section>
      ) : null}

      {showOwnerForm ? (
        <section className="two-column-grid">
          <Panel eyebrow="Access Provisioning" title="Create a station owner account" description="Provision a station owner with the credentials required to register stations and create operators.">
            <form className="stack-form" onSubmit={handleCreateOwner}>
              <div className="form-grid form-grid--2">
                <label className="form-field">
                  <span>Full Name</span>
                  <input type="text" name="name" value={ownerForm.name} onChange={handleOwnerFormChange} required />
                </label>
                <label className="form-field">
                  <span>Email</span>
                  <input type="email" name="email" value={ownerForm.email} onChange={handleOwnerFormChange} required />
                </label>
              </div>

              <div className="form-grid form-grid--2">
                <label className="form-field">
                  <span>Phone Number</span>
                  <input type="text" name="phoneNumber" value={ownerForm.phoneNumber} onChange={handleOwnerFormChange} required />
                </label>
                <label className="form-field">
                  <span>NIC Number</span>
                  <input type="text" name="nicNumber" value={ownerForm.nicNumber} onChange={handleOwnerFormChange} required />
                </label>
              </div>

              <label className="form-field">
                <span>Temporary Password</span>
                <input type="password" name="password" value={ownerForm.password} onChange={handleOwnerFormChange} required />
              </label>

              <button type="submit" className="primary-button" disabled={busyId === 'owner-create'}>
                {busyId === 'owner-create' ? 'Creating Account...' : 'Create Station Owner'}
              </button>
            </form>
          </Panel>

          <Panel eyebrow="Role Model" title="How access is split" description="The frontend only exposes the tools a role can act on.">
            <div className="detail-stack">
              <KeyValue label="Admin" value="Vehicles, stations, and station owner provisioning" />
              <KeyValue label="Station Owner" value="Stations, operators, fuel stock, scan, logs, and summary" />
              <KeyValue label="Station Operator" value="Vehicle intake, scan, logs, and station summary only" />
              <KeyValue label="Vehicle Owner" value="Vehicles, quota visibility, and personal transaction logs" />
            </div>
          </Panel>
        </section>
      ) : null}

      <ActionDialog
        dialog={actionDialog}
        promptValue={promptValue}
        onPromptValueChange={setPromptValue}
        onClose={closeActionDialog}
      />
    </div>
  );
};
