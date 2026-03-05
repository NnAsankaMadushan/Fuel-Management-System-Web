import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../Auth/Auth.css';
import { changePassword, getCurrentUser, getStoredSessionUser } from '../../api/api';
import { getRouteForRole } from '../../utils/userRole';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState(() => getStoredSessionUser());
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const isForced = useMemo(
    () => Boolean(location.state?.forcePasswordChange || currentUser?.mustChangePassword),
    [location.state?.forcePasswordChange, currentUser?.mustChangePassword],
  );

  const dashboardRoute = getRouteForRole(currentUser?.role) || '/';

  useEffect(() => {
    let ignore = false;

    const loadCurrentUser = async () => {
      try {
        const user = await getCurrentUser();
        if (!ignore) {
          setCurrentUser(user);
        }
      } catch (error) {
        if (!ignore) {
          if (error?.response?.status === 401) {
            navigate('/login', { replace: true });
            return;
          }

          setMessage(error.response?.data?.message || 'Unable to verify your account. Please log in again.');
          setIsError(true);
        }
      } finally {
        if (!ignore) {
          setIsBootstrapping(false);
        }
      }
    };

    loadCurrentUser();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage('Current password, new password, and confirmation are required.');
      setIsError(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage('New password and confirmation do not match.');
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const data = await changePassword({ currentPassword, newPassword });
      const updatedUser = data.user || currentUser;
      setCurrentUser(updatedUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(data.message || 'Password changed successfully.');
      setIsError(false);

      if (isForced) {
        navigate(getRouteForRole(updatedUser?.role) || '/login', { replace: true });
      }
    } catch (error) {
      console.error('Password change failed:', error);
      setMessage(error.response?.data?.message || 'Failed to change password.');
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isBootstrapping) {
    return (
      <main className="auth-page">
        <section className="auth-shell auth-shell--compact panel rise-in">
          <div className="auth-panel auth-panel--solo">
            <span className="auth-brand">FuelPlus</span>
            <p className="auth-subtitle">Checking account session...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--compact panel rise-in">
        <div className="auth-panel auth-panel--solo">
          <span className="auth-brand">FuelPlus</span>
          <div>
            <h1>Change password</h1>
            <p className="auth-subtitle">
              {isForced
                ? 'You must change your temporary password before accessing the dashboard.'
                : 'Update your password to keep your account secure.'}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field-group">
              <span>Current password</span>
              <input
                type="password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span>New password</span>
              <input
                type="password"
                placeholder="Enter a new password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span>Confirm new password</span>
              <input
                type="password"
                placeholder="Re-enter the new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </label>

            {!isForced ? (
              <div className="auth-actions">
                <span className="inline-note">Return to your dashboard?</span>
                <Link to={dashboardRoute} className="text-link">
                  Back
                </Link>
              </div>
            ) : null}

            <button type="submit" className="button auth-submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>

          {message ? <p className={`response-banner ${isError ? 'error-banner' : ''}`}>{message}</p> : null}
        </div>
      </section>
    </main>
  );
};

export default ChangePassword;
