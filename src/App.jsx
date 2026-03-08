import { useEffect } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import brandIcon from '/src/assets/Images/Logo.png';
import './App.css';
import DashboardShell from './app/DashboardShell';
import { SessionProvider, useSession } from './app/session';
import {
  ChangePasswordPage,
  LandingPage,
  LoginPage,
  SignUpPage,
  VerifyEmailPage,
} from './app/PublicPages';
import { AdminConsolePage } from './app/AdminPages';
import {
  VehicleDashboardPage,
  VehicleRecordIndexPage,
  VehicleDetailsPage,
  VehicleLogsPage,
  VehicleRegisterPage,
} from './app/VehiclePages';
import { StationOwnerDashboardPage } from './app/StationOwnerDashboardPage';
import { CreateOperatorPage, StationRegisterPage } from './app/StationFormsPage';
import { OperatorDashboardPage, StationLogsPage, StationSummaryPage } from './app/StationReportsPage';
import { QRScanPage } from './app/QrScanPage';
import { getRouteForRole } from './utils/userRole';

const adminRoles = ['admin'];
const vehicleRoles = ['vehicle_owner'];
const stationOwnerRoles = ['station_owner'];
const stationRoles = ['station_owner', 'station_operator'];
const vehicleRegisterRoles = ['vehicle_owner', 'station_operator'];
const vehicleRecordRoles = ['vehicle_owner', 'station_owner', 'station_operator'];
const vehicleDetailRoles = ['vehicle_owner', 'station_owner', 'station_operator', 'admin'];

const AppLoader = ({ label = 'Loading workspace...' }) => (
  <div className="app-loader-screen">
    <div className="app-loader-card">
      <span className="app-loader-mark">
        <img src={brandIcon} alt="Fuel Plus logo" />
      </span>
      <strong>{label}</strong>
      <p>Refreshing the active session and role permissions.</p>
    </div>
  </div>
);

const resolveHomeRoute = (user) => {
  if (!user) {
    return '/';
  }

  if (user.mustChangePassword) {
    return '/change-password';
  }

  return getRouteForRole(user.role) || '/';
};

const PublicOnlyRoute = ({ children }) => {
  const { user, status } = useSession();

  if (user && status === 'loading') {
    return <AppLoader label="Restoring your dashboard..." />;
  }

  if (user) {
    return <Navigate to={resolveHomeRoute(user)} replace />;
  }

  return children;
};

const ProtectedPage = ({ allowedRoles, children }) => {
  const { user, status, rehydrateSession } = useSession();
  const location = useLocation();

  useEffect(() => {
    if (!user && status === 'idle') {
      rehydrateSession().catch(() => {});
    }
  }, [rehydrateSession, status, user]);

  if (!user && status === 'loading') {
    return <AppLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace state={{ forcePasswordChange: true }} />;
  }

  if (Array.isArray(allowedRoles) && !allowedRoles.includes(user.role)) {
    return <Navigate to={resolveHomeRoute(user)} replace />;
  }

  return children;
};

const DashboardPage = ({ allowedRoles, children }) => (
  <ProtectedPage allowedRoles={allowedRoles}>
    <DashboardShell>{children}</DashboardShell>
  </ProtectedPage>
);

const FallbackRoute = () => {
  const { user, status } = useSession();

  if (user && status === 'loading') {
    return <AppLoader />;
  }

  return <Navigate to={resolveHomeRoute(user)} replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={(
        <PublicOnlyRoute>
          <LandingPage />
        </PublicOnlyRoute>
      )}
    />
    <Route
      path="/login"
      element={(
        <PublicOnlyRoute>
          <LoginPage />
        </PublicOnlyRoute>
      )}
    />
    <Route
      path="/signup"
      element={(
        <PublicOnlyRoute>
          <SignUpPage />
        </PublicOnlyRoute>
      )}
    />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
    <Route
      path="/change-password"
      element={(
        <ProtectedPage>
          <ChangePasswordPage />
        </ProtectedPage>
      )}
    />

    <Route path="/admin" element={<DashboardPage allowedRoles={adminRoles}><AdminConsolePage view="overview" /></DashboardPage>} />
    <Route path="/admin/vehicles" element={<DashboardPage allowedRoles={adminRoles}><AdminConsolePage view="vehicles" /></DashboardPage>} />
    <Route path="/admin/stations" element={<DashboardPage allowedRoles={adminRoles}><AdminConsolePage view="stations" /></DashboardPage>} />
    <Route path="/admin/station-owners" element={<DashboardPage allowedRoles={adminRoles}><AdminConsolePage view="owners" /></DashboardPage>} />

    <Route path="/vehicleHome" element={<DashboardPage allowedRoles={vehicleRoles}><VehicleDashboardPage /></DashboardPage>} />
    <Route path="/v-register" element={<DashboardPage allowedRoles={vehicleRegisterRoles}><VehicleRegisterPage /></DashboardPage>} />
    <Route path="/prev-logs" element={<DashboardPage allowedRoles={vehicleRoles}><VehicleLogsPage /></DashboardPage>} />
    <Route path="/vehicle-records" element={<DashboardPage allowedRoles={vehicleRecordRoles}><VehicleRecordIndexPage /></DashboardPage>} />
    <Route path="/vehicle/:id" element={<DashboardPage allowedRoles={vehicleDetailRoles}><VehicleDetailsPage /></DashboardPage>} />
    <Route path="/fuel-quota" element={<FallbackRoute />} />

    <Route path="/s-home" element={<DashboardPage allowedRoles={stationOwnerRoles}><StationOwnerDashboardPage /></DashboardPage>} />
    <Route path="/s-register" element={<DashboardPage allowedRoles={stationOwnerRoles}><StationRegisterPage /></DashboardPage>} />
    <Route path="/create-operator" element={<DashboardPage allowedRoles={stationOwnerRoles}><CreateOperatorPage /></DashboardPage>} />
    <Route path="/scan-qr" element={<DashboardPage allowedRoles={stationRoles}><QRScanPage /></DashboardPage>} />
    <Route path="/s-fuel-quota" element={<DashboardPage allowedRoles={stationRoles}><StationSummaryPage /></DashboardPage>} />
    <Route path="/s-prev-logs" element={<DashboardPage allowedRoles={stationRoles}><StationLogsPage /></DashboardPage>} />
    <Route path="/o-home" element={<DashboardPage allowedRoles={['station_operator']}><OperatorDashboardPage /></DashboardPage>} />

    <Route path="*" element={<FallbackRoute />} />
  </Routes>
);

function App() {
  return (
    <SessionProvider>
      <Router>
        <AppRoutes />
      </Router>
    </SessionProvider>
  );
}

export default App;
