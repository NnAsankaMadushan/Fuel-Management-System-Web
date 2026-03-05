import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../Auth/Auth.css';
import { loginUser } from '../../api/api';
import { getRouteForRole } from '../../utils/userRole';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (typeof location.state?.email === 'string' && location.state.email.trim()) {
      setEmail(location.state.email.trim());
    }
  }, [location.state?.email]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const user = await loginUser({ email, password });

      if (user?.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { forcePasswordChange: true } });
        return;
      }

      const nextRoute = getRouteForRole(user?.role);

      if (nextRoute) navigate(nextRoute);
      else setMessage('The logged-in role is not recognized by the current frontend.');
    } catch (error) {
      console.error('Login failed:', error);
      if (error?.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        navigate('/verify-email', {
          replace: true,
          state: {
            email,
            verificationContext: 'existing',
            serverMessage: error?.response?.data?.message || 'Email verification is required before login.',
          },
        });
        return;
      }

      setMessage(error?.response?.data?.message || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--compact panel rise-in">
        <div className="auth-panel auth-panel--solo">
          <span className="auth-brand">FuelPlus</span>
          <div>
            <h1>Sign in</h1>
            <p className="auth-subtitle">Enter your email and password to continue.</p>
          </div>

          <form className="auth-form" onSubmit={handleLogin}>
            <label className="field-group">
              <span>Email address</span>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="field-group">
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>

            <div className="auth-actions">
              <span className="inline-note">Need an account?</span>
              <Link to="/signup" className="text-link">
                Create one
              </Link>
            </div>

            <button type="submit" className="button auth-submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {message ? <p className="response-banner error-banner">{message}</p> : null}
        </div>
      </section>
    </main>
  );
};

export default Login;
