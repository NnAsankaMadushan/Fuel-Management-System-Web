import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import Footer from '../footer/footer';
import './VehicleHome.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Link } from 'react-router-dom';
import { getMyVehicles } from '../../api/api';

const quickActions = [
  {
    to: '/v-register',
    mark: 'RG',
    title: 'Register vehicle',
    accent: 'rgba(249, 115, 22, 0.28)',
    soft: 'var(--accent-soft)',
    text: 'var(--accent-strong)',
  },
  {
    to: '/prev-logs',
    mark: 'LG',
    title: 'View logs',
    accent: 'rgba(13, 148, 136, 0.26)',
    soft: 'var(--teal-soft)',
    text: 'var(--teal)',
  },
];

const getVehicleStatus = (vehicle) => vehicle?.verificationStatus || (vehicle?.isVerified ? 'approved' : 'pending');

const formatStatus = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
};

const VehicleHome = () => {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const vehicleList = await getMyVehicles();
        setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
      } catch (error) {
        console.error('Error fetching vehicle data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const approvedVehicles = vehicles.filter((vehicle) => getVehicleStatus(vehicle) === 'approved').length;

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="vehicle-hero panel rise-in">
          <div className="vehicle-hero-copy">
            <span className="section-badge">Vehicle</span>
            <h1>My vehicles</h1>
            <p className="lead-text">View quota, logs, approval status, and vehicle details.</p>
          </div>

          <div className="summary-grid">
            <div className="metric-card">
              <div className="metric-label">Vehicles</div>
              <div className="metric-value">{vehicles.length}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Remaining quota</div>
              <div className="metric-value">
                {vehicles.reduce((sum, vehicle) => sum + (vehicle.remainingQuota || 0), 0)}L
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Approved vehicles</div>
              <div className="metric-value">{approvedVehicles}</div>
            </div>
          </div>
        </section>

        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="section-badge">Quick Actions</span>
              <h2>Common tasks</h2>
            </div>
          </div>

          <div className="action-grid">
            {quickActions.map((action) => (
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
              <span className="section-badge">Vehicles</span>
              <h2>Registered vehicles</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="empty-state">Loading vehicles...</div>
          ) : vehicles.length === 0 ? (
            <div className="empty-state">No vehicles registered yet.</div>
          ) : (
            <div className="vehicle-card-grid">
              {vehicles.map((vehicle) => {
                const quotaPercent = vehicle.allocatedQuota
                  ? Math.round((vehicle.remainingQuota / vehicle.allocatedQuota) * 100)
                  : 0;
                const status = getVehicleStatus(vehicle);

                return (
                  <article key={vehicle._id} className="vehicle-card section-card">
                    <div className="vehicle-card-top">
                      <div className="vehicle-card-copy">
                        <div className="vehicle-card-heading">
                          <h3>{vehicle.vehicleNumber}</h3>
                          <span className={`status-chip status-chip--${status}`}>{formatStatus(status)}</span>
                        </div>
                        <p>{vehicle.vehicleType || 'Type not set'}</p>
                        {status !== 'approved' ? (
                          <p className={`vehicle-status-note vehicle-status-note--${status}`}>
                            {vehicle.approvalNote ||
                              (status === 'pending'
                                ? 'Waiting for admin approval before fuel quota can be used.'
                                : 'This vehicle has been rejected. Check the latest admin note.')}
                          </p>
                        ) : null}
                      </div>

                      <div className="vehicle-card-progress">
                        <CircularProgressbar
                          value={quotaPercent}
                          text={`${vehicle.remainingQuota || 0}L`}
                          styles={buildStyles({
                            textColor: '#dd5b11',
                            pathColor: '#f97316',
                            trailColor: '#f2e7da',
                          })}
                        />
                      </div>
                    </div>

                    <div className="vehicle-card-stats">
                      <div>
                        <span className="metric-label">Allocated</span>
                        <strong>{vehicle.allocatedQuota || 0}L</strong>
                      </div>
                      <div>
                        <span className="metric-label">Remaining</span>
                        <strong>{vehicle.remainingQuota || 0}L</strong>
                      </div>
                    </div>

                    <Link to={`/vehicle/${vehicle._id}`} className="secondary-button vehicle-details-link">
                      Details
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default VehicleHome;
