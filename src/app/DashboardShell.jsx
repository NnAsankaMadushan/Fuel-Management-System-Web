import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, matchPath, useLocation, useNavigate } from 'react-router-dom';
import brandIcon from '/src/assets/Images/Logo.png';
import {
  getMyNotifications,
  getWebPushConfig,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerWebPushSubscription,
  unregisterWebPushSubscription,
} from '../api/api';
import { appConfig } from '../config/appConfig';
import {
  requestBrowserNotificationPermission,
  sendBrowserNotification,
} from '../utils/browserNotifications';
import {
  applyNotificationRead,
  emitNotificationRead,
  NOTIFICATION_READ_EVENT,
} from '../utils/notifications';
import { formatUserRole, getRouteForRole } from '../utils/userRole';
import {
  ensureWebPushSubscription,
  getCurrentWebPushSubscription,
} from '../utils/webPushNotifications';
import { useAppToast } from './appToast';
import { useSession } from './session';

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 13h7V4H4zm9 7h7v-9h-7zM4 20h7v-5H4zm9-9h7V4h-7z" fill="currentColor" />
  </svg>
);

const VehicleIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 15.5h14l-1-4.6a2 2 0 0 0-2-1.6H8a2 2 0 0 0-2 1.6zm0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm14 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM3 17V9.8a2 2 0 0 1 2-2l1.1-2A2 2 0 0 1 7.9 4h8.2a2 2 0 0 1 1.8 1.8l1.1 2a2 2 0 0 1 2 2V17"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const StationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 21V4.6A1.6 1.6 0 0 1 8.6 3h6.8A1.6 1.6 0 0 1 17 4.6V21M5 21h14M10 7h4M10 11h4M10 15h4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const OperatorIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 9a7 7 0 0 1 14 0M18.5 9.5h4m-2-2v4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const ScanIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 3H4a1 1 0 0 0-1 1v3m17-4h-3m3 0a1 1 0 0 1 1 1v3M3 17v3a1 1 0 0 0 1 1h3m14-4v3a1 1 0 0 1-1 1h-3M7 8h2v2H7zm4 0h6v2h-6zm-4 4h6v4H7zm8 0h2v2h-2zm2 2h2v2h-2z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    />
  </svg>
);

const SummaryIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 19V9m7 10V5m7 14v-7M3 21h18"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const LogsIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M6 4h9.5L20 8.5V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm8.5 0V9H20M8.5 12h7m-7 3.5h7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const UsersIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M16 21a4 4 0 0 0-8 0m12 0a4 4 0 0 0-3.5-3.96M4 21a4 4 0 0 1 3.5-3.96M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm5 1a3 3 0 1 1-6 0m-9 0a3 3 0 1 1-6 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    />
  </svg>
);

const MenuIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M4 7h16M4 12h16M4 17h16"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

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

const navigationByRole = {
  admin: [
    {
      title: 'Control Center',
      items: [
        { to: '/admin', label: 'Dashboard', icon: DashboardIcon },
        { to: '/admin/vehicles', label: 'Vehicle Reviews', icon: VehicleIcon },
        { to: '/admin/stations', label: 'Station Registry', icon: StationIcon },
        { to: '/admin/station-owners', label: 'Owner Accounts', icon: UsersIcon },
      ],
    },
  ],
  vehicle_owner: [
    {
      title: 'Vehicle Desk',
      items: [
        { to: '/vehicleHome', label: 'Dashboard', icon: DashboardIcon },
        { to: '/v-register', label: 'Register Vehicle', icon: VehicleIcon },
        { to: '/prev-logs', label: 'Fuel Logs', icon: LogsIcon },
        { to: '/vehicle-records', label: 'Vehicle Records', icon: VehicleIcon, activePatterns: ['/vehicle-records', '/vehicle/:id'] },
      ],
    },
  ],
  station_owner: [
    {
      title: 'Station Desk',
      items: [
        { to: '/s-home', label: 'Dashboard', icon: DashboardIcon },
        { to: '/s-register', label: 'Register Station', icon: StationIcon },
        { to: '/create-operator', label: 'Create Operator', icon: OperatorIcon },
        { to: '/vehicle-records', label: 'Vehicle Records', icon: VehicleIcon, activePatterns: ['/vehicle-records', '/vehicle/:id'] },
        { to: '/scan-qr', label: 'QR Scan', icon: ScanIcon },
        { to: '/s-fuel-quota', label: 'Fuel Summary', icon: SummaryIcon },
        { to: '/s-prev-logs', label: 'Station Logs', icon: LogsIcon },
      ],
    },
  ],
  station_operator: [
    {
      title: 'Pump Operations',
      items: [
        { to: '/o-home', label: 'Dashboard', icon: DashboardIcon },
        { to: '/v-register', label: 'Register Vehicle', icon: VehicleIcon },
        { to: '/vehicle-records', label: 'Vehicle Records', icon: VehicleIcon, activePatterns: ['/vehicle-records', '/vehicle/:id'] },
        { to: '/scan-qr', label: 'QR Scan', icon: ScanIcon },
        { to: '/s-fuel-quota', label: 'Fuel Summary', icon: SummaryIcon },
        { to: '/s-prev-logs', label: 'Station Logs', icon: LogsIcon },
      ],
    },
  ],
};

const pageMeta = [
  {
    pattern: '/admin',
    title: 'Admin Control Tower',
    badge: 'Admin',
    description: 'Review registrations, manage station accounts, and monitor system activity.',
  },
  {
    pattern: '/admin/vehicles',
    title: 'Vehicle Review Queue',
    badge: 'Admin',
    description: 'Approve, reject, inspect, and clean up vehicle registration records.',
  },
  {
    pattern: '/admin/stations',
    title: 'Station Registry',
    badge: 'Admin',
    description: 'Track registered stations, assigned owners, and operator coverage.',
  },
  {
    pattern: '/admin/station-owners',
    title: 'Station Owner Accounts',
    badge: 'Admin',
    description: 'Create and distribute station owner access with the correct operational scope.',
  },
  {
    pattern: '/vehicleHome',
    title: 'Vehicle Dashboard',
    badge: 'Vehicle Owner',
    description: 'Watch fuel quota, vehicle approvals, and recent fueling activity from one workspace.',
  },
  {
    pattern: '/v-register',
    title: 'Vehicle Registration',
    badge: 'Operations',
    description: 'Create a new vehicle record and route it into the approval and quota workflow.',
  },
  {
    pattern: '/prev-logs',
    title: 'Vehicle Fuel Logs',
    badge: 'History',
    description: 'Review transaction history, litres used, and station-by-station fueling activity.',
  },
  {
    pattern: '/vehicle-records',
    title: 'Vehicle Records',
    badge: 'Vehicle',
    description: 'Select from the vehicles registered under your account and open the current quota and QR record.',
  },
  {
    pattern: '/vehicle/:id',
    title: 'Vehicle Record',
    badge: 'Vehicle',
    description: 'Inspect quota balance, approval history, and the QR artifact used for station scanning.',
  },
  {
    pattern: '/s-home',
    title: 'Station Owner Dashboard',
    badge: 'Station Owner',
    description: 'Manage stations, fuel stock, operators, and current forecourt activity.',
  },
  {
    pattern: '/o-home',
    title: 'Operator Dashboard',
    badge: 'Station Operator',
    description: 'Run day-to-day station work with fast access to scan, summary, and transaction records.',
  },
  {
    pattern: '/s-register',
    title: 'Register Fuel Station',
    badge: 'Station Owner',
    description: 'Create a new station record and seed it with the initial stock and location details.',
  },
  {
    pattern: '/create-operator',
    title: 'Create Station Operator',
    badge: 'Station Owner',
    description: 'Provision a pump operator account that can scan QR codes and register fuel transactions.',
  },
  {
    pattern: '/scan-qr',
    title: 'QR Fuel Scan',
    badge: 'Forecourt',
    description: 'Capture the QR payload, confirm litres pumped, and record the transaction instantly.',
  },
  {
    pattern: '/s-fuel-quota',
    title: 'Fuel Summary',
    badge: 'Station',
    description: 'Track current fuel availability, seven-day dispensing trend, and overall transaction throughput.',
  },
  {
    pattern: '/s-prev-logs',
    title: 'Station Logs',
    badge: 'History',
    description: 'Inspect recent transactions across the assigned station scope.',
  },
];

const getPageMeta = (pathname) =>
  pageMeta.find((item) => matchPath({ path: item.pattern, end: true }, pathname))
  || {
    title: 'Fuel Plus Workspace',
    badge: 'Workspace',
    description: 'Role-based access keeps every feature in the right operational lane.',
  };

const buildSupportLines = () =>
  [appConfig.supportPhone, appConfig.supportEmail, appConfig.supportAddress].filter(Boolean);

const formatStationPreview = (user) => {
  const stationNames = Array.isArray(user?.stationNames) ? user.stationNames.filter(Boolean) : [];
  const primaryStationName = user?.primaryStationName || stationNames[0] || '';

  if (!primaryStationName) {
    return '';
  }

  const remainingCount = stationNames.length > 1 ? stationNames.length - 1 : 0;
  return remainingCount > 0 ? `${primaryStationName} +${remainingCount}` : primaryStationName;
};

const getInitials = (name) =>
  String(name || 'Fuel Plus')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

const formatNotificationStatus = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
};

const formatNotificationTime = (value) =>
  new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const matchesSidebarItemPattern = (pathname, item) =>
  Array.isArray(item.activePatterns)
  && item.activePatterns.some((pattern) => matchPath({ path: pattern, end: true }, pathname));

const WEB_PUSH_ENABLED_ROLES = new Set([
  'vehicle_owner',
  'station_owner',
  'station_operator',
]);

const SidebarGroup = ({ group, pathname }) => (
  <section className="sidebar-group">
    <h2 className="sidebar-group-title">{group.title}</h2>
    <div className="sidebar-link-stack">
      {group.items.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `sidebar-link${isActive || matchesSidebarItemPattern(pathname, item) ? ' sidebar-link--active' : ''}`
            }
            end={item.end ?? (item.to === '/admin' || item.to === '/vehicleHome' || item.to === '/s-home' || item.to === '/o-home')}
          >
            <span className="sidebar-link-icon">
              <Icon />
            </span>
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  </section>
);

const DashboardShell = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationLoading, setIsNotificationLoading] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const shownPopupIdsRef = useRef(new Set());
  const isBulkReadInFlightRef = useRef(false);
  const showToast = useAppToast();

  const meta = useMemo(() => getPageMeta(location.pathname), [location.pathname]);
  const homeRoute = getRouteForRole(user?.role) || '/';
  const navigationGroups = navigationByRole[user?.role] || [];
  const supportLines = buildSupportLines();
  const stationPreview = formatStationPreview(user);
  const unreadNotifications = notifications.filter((notification) => !notification.isRead).length;
  const canOpenVehicleFromNotification = user?.role === 'vehicle_owner' || user?.role === 'admin';
  const pushNotificationsEnabled = WEB_PUSH_ENABLED_ROLES.has(user?.role);

  useEffect(() => {
    setIsSidebarOpen(false);
    setIsNotificationModalOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user?._id) {
      setNotifications([]);
      setIsNotificationLoading(false);
      setIsNotificationModalOpen(false);
      return;
    }

    let ignore = false;

    const loadNotifications = async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setIsNotificationLoading(true);
        }

        const notificationList = await getMyNotifications();

        if (!ignore) {
          setNotifications(Array.isArray(notificationList) ? notificationList : []);
        }
      } catch (error) {
        if (!ignore) {
          console.error('Notification load failed:', error);
          setNotifications([]);
        }
      } finally {
        if (!ignore && !silent) {
          setIsNotificationLoading(false);
        }
      }
    };

    loadNotifications();

    const intervalId = window.setInterval(() => {
      loadNotifications({ silent: true });
    }, 30000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [user?._id]);

  useEffect(() => {
    if (!pushNotificationsEnabled) {
      return;
    }

    requestBrowserNotificationPermission();
  }, [pushNotificationsEnabled]);

  useEffect(() => {
    if (!user?._id || !pushNotificationsEnabled) {
      return;
    }

    let ignore = false;

    const syncWebPush = async () => {
      try {
        const webPushConfig = await getWebPushConfig();

        if (!webPushConfig?.enabled || !webPushConfig?.vapidPublicKey || ignore) {
          return;
        }

        const subscription = await ensureWebPushSubscription({
          vapidPublicKey: webPushConfig.vapidPublicKey,
        });

        if (!subscription || ignore) {
          return;
        }

        await registerWebPushSubscription(subscription.toJSON());
      } catch (error) {
        console.error('Web push subscription sync failed:', error);
      }
    };

    syncWebPush();

    return () => {
      ignore = true;
    };
  }, [pushNotificationsEnabled, user?._id]);

  useEffect(() => {
    shownPopupIdsRef.current = new Set();
  }, [user?._id]);

  const markNotificationsAsRead = useCallback(async (notificationIds) => {
    if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
      return;
    }

    const targetIds = notificationIds.filter(Boolean);
    if (!targetIds.length) {
      return;
    }

    try {
      await markAllNotificationsAsRead();
    } catch (bulkReadError) {
      const fallbackResults = await Promise.allSettled(
        targetIds.map((notificationId) => markNotificationAsRead(notificationId)),
      );

      const successfulFallback = targetIds.filter(
        (notificationId, index) =>
          notificationId &&
          fallbackResults[index]?.status === 'fulfilled',
      );

      if (!successfulFallback.length) {
        throw bulkReadError;
      }
    }

    const readIds = new Set(targetIds);
    setNotifications((current) =>
      current.map((notification) =>
        readIds.has(notification._id) ? { ...notification, isRead: true } : notification,
      ),
    );

    targetIds.forEach((notificationId) => emitNotificationRead(notificationId));
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

  useEffect(() => {
    if (!notifications.length) {
      return;
    }

    const nextUnread = notifications.find(
      (notification) =>
        notification &&
        !notification.isRead &&
        notification._id &&
        !shownPopupIdsRef.current.has(notification._id),
    );

    if (!nextUnread?._id) {
      return;
    }

    shownPopupIdsRef.current.add(nextUnread._id);

    showToast({
      id: `notification-${nextUnread._id}`,
      title: nextUnread.title || 'Notification',
      description: nextUnread.message || '',
      status: 'notification',
      duration: 6500,
    });

    if (typeof document !== 'undefined' && document.hidden) {
      sendBrowserNotification({
        title: nextUnread.title || 'Fuel Plus',
        message: nextUnread.message || '',
        tag: `fuelplus-${nextUnread._id}`,
      });
    }
  }, [notifications, showToast]);

  useEffect(() => {
    if (!isNotificationModalOpen || !notifications.length) {
      return;
    }

    if (isBulkReadInFlightRef.current) {
      return;
    }

    const unreadNotificationIds = notifications
      .filter((notification) => notification && !notification.isRead && notification._id)
      .map((notification) => notification._id);

    if (!unreadNotificationIds.length) {
      return;
    }

    isBulkReadInFlightRef.current = true;

    markNotificationsAsRead(unreadNotificationIds)
      .catch((error) => {
        console.error('Error auto-marking notifications as read:', error);
      })
      .finally(() => {
        isBulkReadInFlightRef.current = false;
      });
  }, [isNotificationModalOpen, markNotificationsAsRead, notifications]);

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

  const handleSignOut = async () => {
    const existingSubscription = await getCurrentWebPushSubscription();

    if (existingSubscription) {
      try {
        await unregisterWebPushSubscription(existingSubscription.toJSON());
      } catch (error) {
        console.error('Web push endpoint unregister failed:', error);
      }

      try {
        await existingSubscription.unsubscribe();
      } catch (error) {
        console.error('Web push local unsubscribe failed:', error);
      }
    }

    await signOut();
    navigate('/login', { replace: true });
  };

  const handleNotificationModalToggle = () => {
    requestBrowserNotificationPermission();
    setIsNotificationModalOpen((current) => !current);
  };

  const handleNotificationModalClose = () => {
    setIsNotificationModalOpen(false);
  };

  const handleOpenVehicle = (vehicleId) => {
    setIsNotificationModalOpen(false);
    navigate(`/vehicle/${vehicleId}`);
  };

  return (
    <div className="dashboard-shell">
      <button
        type="button"
        className={`dashboard-backdrop${isSidebarOpen ? ' dashboard-backdrop--visible' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden={!isSidebarOpen}
        tabIndex={-1}
      />

      <aside className={`dashboard-sidebar${isSidebarOpen ? ' dashboard-sidebar--open' : ''}`}>
        <Link to={homeRoute} className="sidebar-brand">
          <span className="sidebar-brand-mark">
            <img src={brandIcon} alt="Fuel Plus logo" />
          </span>
          <div>
            <strong>Fuel Plus</strong>
            <span>Fuel Management System</span>
          </div>
        </Link>

        <div className="sidebar-profile-card">
          <span className="sidebar-profile-badge">{formatUserRole(user?.role)}</span>
          <strong>{user?.name || 'Fuel Plus User'}</strong>
          <p>{stationPreview || 'Access is scoped to your assigned workspace and actions.'}</p>
        </div>

        <div className="sidebar-groups">
          {navigationGroups.map((group) => (
            <SidebarGroup key={group.title} group={group} pathname={location.pathname} />
          ))}
        </div>

        <div className="sidebar-support-card">
          <span className="sidebar-profile-badge">Support</span>
          <strong>Operations help desk</strong>
          {supportLines.length > 0 ? (
            <ul className="support-line-list">
              {supportLines.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p>Set `VITE_SUPPORT_*` values to surface support details here.</p>
          )}
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-topbar-main">
            <button
              type="button"
              className="topbar-menu-button"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-label="Toggle navigation"
            >
              <MenuIcon />
            </button>

            <div className="dashboard-heading">
              <span className="dashboard-heading-badge">{meta.badge}</span>
              <h1>{meta.title}</h1>
              <p>{meta.description}</p>
            </div>
          </div>

          <div className="dashboard-topbar-actions">
            <div className="dashboard-topbar-action-row">
              <button
                type="button"
                className="topbar-notification-button"
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
                  <span className="topbar-notification-badge">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                ) : null}
              </button>
              <Link to="/change-password" className="secondary-button">
                Change Password
              </Link>
              <button type="button" className="ghost-button" onClick={handleSignOut}>
                Logout
              </button>
            </div>
            <div className="topbar-user-card">
              <span className="topbar-user-avatar">{getInitials(user?.name)}</span>
              <div className="topbar-user-meta">
                <strong>{user?.name || 'Fuel Plus User'}</strong>
                <span>{[formatUserRole(user?.role), stationPreview].filter(Boolean).join(' | ')}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-content">{children}</main>
      </div>

      {isNotificationModalOpen ? (
        <div
          className="notification-modal-backdrop"
          role="presentation"
          onClick={handleNotificationModalClose}
        >
          <div
            className="notification-modal-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-notifications-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="notification-modal-header">
              <div className="notification-modal-copy">
                <span className="panel-eyebrow">Notifications</span>
                <h2 id="dashboard-notifications-title">Recent alerts</h2>
                <p>
                  {unreadNotifications > 0
                    ? `${unreadNotifications} unread update${unreadNotifications === 1 ? '' : 's'}`
                    : 'All caught up.'}
                </p>
              </div>
              <button
                type="button"
                className="ghost-button notification-modal-close"
                onClick={handleNotificationModalClose}
              >
                Close
              </button>
            </div>

            {isNotificationLoading ? (
              <div className="workspace-empty notification-modal-empty">
                <strong>Loading notifications</strong>
                <p>Fetching the latest alerts.</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="workspace-empty notification-modal-empty">
                <strong>No notifications yet</strong>
                <p>Updates will appear here as soon as they are created.</p>
              </div>
            ) : (
              <div className="notification-modal-list">
                {notifications.map((notification) => (
                  <article
                    key={notification._id}
                    className={`notification-entry${notification.isRead ? ' notification-entry--read' : ''}`}
                  >
                    <div className="notification-entry-head">
                      <div className="notification-entry-copy">
                        <div className="notification-entry-meta">
                          <span className={`status-pill status-pill--${String(notification.status || 'pending').toLowerCase()}`}>
                            {formatNotificationStatus(notification.status)}
                          </span>
                          {notification.vehicle?.vehicleNumber ? (
                            <span className="text-chip">{notification.vehicle.vehicleNumber}</span>
                          ) : null}
                          {!notification.isRead ? (
                            <span className="text-chip notification-entry-chip">New</span>
                          ) : null}
                        </div>
                        <strong>{notification.title || 'Notification'}</strong>
                        <p>{notification.message || 'No details available.'}</p>
                      </div>
                      <span className="notification-entry-time">
                        {formatNotificationTime(notification.createdAt)}
                      </span>
                    </div>

                    {canOpenVehicleFromNotification && notification.vehicle?._id ? (
                      <div className="notification-entry-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => handleOpenVehicle(notification.vehicle._id)}
                        >
                          Open vehicle
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default DashboardShell;
