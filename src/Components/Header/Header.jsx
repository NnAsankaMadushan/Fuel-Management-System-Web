import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import brandIcon from '/src/assets/Images/Logo.png';
import './Header.css';
import {
  getCurrentUser,
  getMyNotifications,
  getStoredSessionUser,
  logoutUser,
  markNotificationAsRead,
} from '../../api/api';
import {
  applyNotificationRead,
  emitNotificationRead,
  NOTIFICATION_READ_EVENT,
} from '../../utils/notifications';

const getSectionLabel = (pathname) => {
  if (pathname === '/') return 'Home';
  if (pathname.startsWith('/admin')) return 'Admin';
  if (pathname.startsWith('/vehicle')) return 'Vehicle';
  if (pathname.startsWith('/s-')) return 'Station';
  if (pathname.startsWith('/o-home')) return 'Operator';
  if (pathname.startsWith('/scan-qr')) return 'QR Scan';
  return 'FuelPlus';
};

const formatRole = (role) => {
  if (!role) return 'User';

  return role
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};

const formatStationPreview = (user) => {
  const stationNames = Array.isArray(user?.stationNames) ? user.stationNames.filter(Boolean) : [];
  const primaryStationName = user?.primaryStationName || stationNames[0] || '';

  if (!primaryStationName) {
    return '';
  }

  const remainingCount = stationNames.length > 1 ? stationNames.length - 1 : 0;
  return remainingCount > 0 ? `${primaryStationName} +${remainingCount}` : primaryStationName;
};

const formatStatus = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
};

const formatNotificationTime = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M9.5 17a2.5 2.5 0 0 0 5 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 6h16M4 12h16M4 18h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M3 10.4 12 3l9 7.4V20a1 1 0 0 1-1 1h-5.6a1 1 0 0 1-1-1v-4.6a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
    />
  </svg>
);

const RegisterIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 5v14M5 12h14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
    <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
  </svg>
);

const LogsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 4h9.5L20 8.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
    <path d="M14.5 4V9H20" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
    <path d="M8.5 12h7M8.5 15.5h7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7" />
  </svg>
);

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 3H4a1 1 0 0 0-1 1v3M17 3h3a1 1 0 0 1 1 1v3M21 17v3a1 1 0 0 1-1 1h-3M3 17v3a1 1 0 0 0 1 1h3M8 8h2v2H8zM12 8h4v2h-4zM8 12h4v4H8zM14 12h2v2h-2zM16 14h2v2h-2z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const mobileNavByRole = {
  vehicle_owner: [
    {
      label: 'Home',
      to: '/vehicleHome',
      matches: ['/vehicleHome', '/vehicle', '/fuel-quota'],
      icon: HomeIcon,
    },
    {
      label: 'Register',
      to: '/v-register',
      matches: ['/v-register'],
      icon: RegisterIcon,
    },
    {
      label: 'Logs',
      to: '/prev-logs',
      matches: ['/prev-logs'],
      icon: LogsIcon,
    },
  ],
  station_owner: [
    {
      label: 'Home',
      to: '/s-home',
      matches: ['/s-home'],
      icon: HomeIcon,
    },
    {
      label: 'Register',
      to: '/s-register',
      matches: ['/s-register', '/create-operator'],
      icon: RegisterIcon,
    },
    {
      label: 'Scan',
      to: '/scan-qr',
      matches: ['/scan-qr'],
      icon: ScanIcon,
    },
    {
      label: 'Logs',
      to: '/s-prev-logs',
      matches: ['/s-prev-logs', '/s-fuel-quota'],
      icon: LogsIcon,
    },
  ],
  station_operator: [
    {
      label: 'Home',
      to: '/o-home',
      matches: ['/o-home'],
      icon: HomeIcon,
    },
    {
      label: 'Register',
      to: '/v-register',
      matches: ['/v-register'],
      icon: RegisterIcon,
    },
    {
      label: 'Scan',
      to: '/scan-qr',
      matches: ['/scan-qr'],
      icon: ScanIcon,
    },
    {
      label: 'Logs',
      to: '/s-prev-logs',
      matches: ['/s-prev-logs', '/s-fuel-quota'],
      icon: LogsIcon,
    },
  ],
  admin: [
    {
      label: 'Admin',
      to: '/admin',
      matches: ['/admin'],
      icon: HomeIcon,
    },
  ],
};

const getMobileNavItems = (role) => mobileNavByRole[role] || [];

const isMobileNavItemActive = (pathname, matches) =>
  matches.some((value) => pathname === value || pathname.startsWith(`${value}/`));

function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionLabel = getSectionLabel(location.pathname);
  const [currentUser, setCurrentUser] = useState(() => getStoredSessionUser());
  const [notifications, setNotifications] = useState([]);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [notificationActionId, setNotificationActionId] = useState('');
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const stationPreview = formatStationPreview(currentUser);
  const shouldShowNotifications = currentUser?.role === 'vehicle_owner';
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const mobileNavItems = getMobileNavItems(currentUser?.role);

  useEffect(() => {
    let ignore = false;

    const loadUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!ignore) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (!ignore && error?.response?.status === 401) {
          setCurrentUser(null);
        }
      }
    };

    loadUser();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!currentUser || !shouldShowNotifications) {
      setNotifications([]);
      setIsNotificationLoading(false);
      setIsNotificationModalOpen(false);
      return;
    }

    let ignore = false;

    const loadNotifications = async () => {
      try {
        setIsNotificationLoading(true);
        const notificationList = await getMyNotifications();

        if (!ignore) {
          setNotifications(notificationList);
        }
      } catch (error) {
        if (!ignore) {
          if (error?.response?.status === 401) {
            setCurrentUser(null);
            setNotifications([]);
          } else {
            console.error('Notification load failed:', error);
          }
        }
      } finally {
        if (!ignore) {
          setIsNotificationLoading(false);
        }
      }
    };

    loadNotifications();

    return () => {
      ignore = true;
    };
  }, [currentUser, location.pathname, shouldShowNotifications]);

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

  useEffect(() => {
    setIsNotificationModalOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isNotificationModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isNotificationModalOpen]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setCurrentUser(null);
      setNotifications([]);
      setIsNotificationModalOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleNotificationModalToggle = () => {
    setIsNotificationModalOpen((current) => !current);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
  };

  const handleMenuToggle = () => {
    setIsMobileMenuOpen((current) => !current);
  };

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

  const handleOpenVehicle = (vehicleId) => {
    handleNotificationModalClose();
    navigate(`/vehicle/${vehicleId}`);
  };

  return (
    <>
      <header className="header-container">
        <nav className="navbar">
          <Link to="/" className="navbar-brand">
            <span className="navbar-brand-mark">
              <img src={brandIcon} alt="FuelPlus logo" />
            </span>
            <div className="brand-name">
              <span className="brand-title">Fuel<span className="highlightedText">Plus</span></span>
              <span className="brand-copy">{sectionLabel}</span>
            </div>
          </Link>

          <div className="navbar-meta">
            <button
              type="button"
              className={`navbar-menu-toggle ${isMobileMenuOpen ? 'navbar-menu-toggle--open' : ''}`}
              onClick={handleMenuToggle}
              aria-expanded={isMobileMenuOpen}
              aria-controls="header-user-menu"
            >
              <MenuIcon />
              <span>{isMobileMenuOpen ? 'Close' : 'Menu'}</span>
            </button>

            <div
              id="header-user-menu"
              className={`navbar-meta-content ${isMobileMenuOpen ? 'navbar-meta-content--open' : ''}`}
            >
              <div className="navbar-meta-row">
                {shouldShowNotifications ? (
                  <button
                    type="button"
                    className="notification-button"
                    onClick={handleNotificationModalToggle}
                    aria-label={
                      unreadNotifications > 0
                        ? `Open notifications. ${unreadNotifications} unread.`
                        : 'Open notifications'
                    }
                    aria-haspopup="dialog"
                    aria-expanded={isNotificationModalOpen}
                  >
                    <BellIcon />
                    {unreadNotifications > 0 ? (
                      <span className="notification-badge">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>
                    ) : null}
                  </button>
                ) : null}

                <div className="navbar-user">
                  <span className="navbar-user-name">{currentUser?.name || 'FuelPlus User'}</span>
                  <span className="navbar-user-role">
                    {formatRole(currentUser?.role)}
                    {stationPreview ? <span className="navbar-user-station"> - {stationPreview}</span> : null}
                  </span>
                </div>
              </div>

              <button onClick={handleLogout} className="secondary-button logout-button" type="button">
                Logout
              </button>
            </div>
          </div>
        </nav>
      </header>

      {mobileNavItems.length > 0 ? (
        <nav className="mobile-tabbar" aria-label="Mobile navigation">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = isMobileNavItemActive(location.pathname, item.matches);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`mobile-tabbar-link ${isActive ? 'mobile-tabbar-link--active' : ''}`}
              >
                <Icon />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}

      {shouldShowNotifications && isNotificationModalOpen ? (
        <div className="modal" role="presentation" onClick={handleNotificationModalClose}>
          <div
            className="modal-content header-notification-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-notifications-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="header-notification-modal-top">
              <div className="header-notification-copy">
                <span className="section-badge">Notifications</span>
                <h2 id="header-notifications-title">Approval updates</h2>
                <p>
                  {unreadNotifications > 0
                    ? `${unreadNotifications} unread update${unreadNotifications === 1 ? '' : 's'}`
                    : 'All caught up.'}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button header-notification-close"
                onClick={handleNotificationModalClose}
              >
                Close
              </button>
            </div>

            {isNotificationLoading ? (
              <div className="empty-state">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">No approval notifications yet.</div>
            ) : (
              <div className="header-notification-list">
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className={`header-notification-card section-card ${
                      notification.isRead ? 'header-notification-card--read' : ''
                    }`}
                  >
                    <div className="header-notification-card-head">
                      <div>
                        <div className="header-notification-card-meta">
                          <span className={`status-chip status-chip--${notification.status}`}>
                            {formatStatus(notification.status)}
                          </span>
                          {notification.vehicle?.vehicleNumber ? <span className="tag">{notification.vehicle.vehicleNumber}</span> : null}
                          {!notification.isRead ? <span className="tag">New</span> : null}
                        </div>
                        <h3>{notification.title}</h3>
                        <p>{notification.message}</p>
                      </div>
                      <span className="inline-note">{formatNotificationTime(notification.createdAt)}</span>
                    </div>

                    <div className="header-notification-actions">
                      {notification.vehicle?._id ? (
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleOpenVehicle(notification.vehicle._id)}
                        >
                          Open vehicle
                        </button>
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
          </div>
        </div>
      ) : null}
    </>
  );
}

export default Header;
