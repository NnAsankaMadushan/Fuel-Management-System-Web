import { useEffect, useState } from 'react';
import Header from '../Header/Header';
import Footer from '../footer/footer';
import './VehicleHome.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { Link } from 'react-router-dom';
import { getMyNotifications, getMyVehicles, markNotificationAsRead } from '../../api/api';
import {
  applyNotificationRead,
  emitNotificationRead,
  NOTIFICATION_READ_EVENT,
} from '../../utils/notifications';

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

const formatNotificationTime = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const VehicleHome = () => {
  const [vehicles, setVehicles] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotificationLoading, setIsNotificationLoading] = useState(true);
  const [notificationActionId, setNotificationActionId] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [vehicleResult, notificationResult] = await Promise.allSettled([getMyVehicles(), getMyNotifications()]);

      if (vehicleResult.status === 'fulfilled') {
        setVehicles(vehicleResult.value);
      } else {
        console.error('Error fetching vehicle data:', vehicleResult.reason);
      }

      if (notificationResult.status === 'fulfilled') {
        setNotifications(notificationResult.value);
      } else {
        console.error('Error fetching notifications:', notificationResult.reason);
      }

      setIsLoading(false);
      setIsNotificationLoading(false);
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const syncReadStatus = (event) => {
      const notificationId = event?.detail?.notificationId;

      if (!notificationId) {
        return;
      }

      setNotifications((current) => applyNotificationRead(current, notificationId));
    };

    window.addEventListener(NOTIFICATION_READ_EVENT, syncReadStatus);

    return () => {
      window.removeEventListener(NOTIFICATION_READ_EVENT, syncReadStatus);
    };
  }, []);

  const handleMarkAsRead = async (notificationId) => {
    try {
      setNotificationActionId(notificationId);
      await markNotificationAsRead(notificationId);
      setNotifications((current) => applyNotificationRead(current, notificationId));
      emitNotificationRead(notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    } finally {
      setNotificationActionId('');
    }
  };

  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;

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
              <div className="metric-label">Unread notifications</div>
              <div className="metric-value">{unreadNotifications}</div>
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
              <span className="section-badge">Notifications</span>
              <h2>Approval updates</h2>
            </div>
          </div>

          {isNotificationLoading ? (
            <div className="empty-state">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="empty-state">No approval notifications yet.</div>
          ) : (
            <div className="notification-stack">
              {notifications.map((notification) => (
                <article
                  key={notification._id}
                  className={`notification-card section-card ${notification.isRead ? 'notification-card--read' : ''}`}
                >
                  <div className="notification-card-top">
                    <div>
                      <div className="notification-card-meta">
                        <span className={`status-chip status-chip--${notification.status}`}>
                          {formatStatus(notification.status)}
                        </span>
                        {!notification.isRead ? <span className="tag">New</span> : null}
                      </div>
                      <h3>{notification.title}</h3>
                      <p>{notification.message}</p>
                    </div>
                    <span className="inline-note">{formatNotificationTime(notification.createdAt)}</span>
                  </div>

                  <div className="notification-card-actions">
                    {notification.vehicle?._id ? (
                      <Link to={`/vehicle/${notification.vehicle._id}`} className="secondary-button">
                        Open vehicle
                      </Link>
                    ) : null}
                    {!notification.isRead ? (
                      <button
                        type="button"
                        className="ghost-button"
                        disabled={notificationActionId === notification._id}
                        onClick={() => handleMarkAsRead(notification._id)}
                      >
                        {notificationActionId === notification._id ? 'Saving...' : 'Mark as read'}
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          )}
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
