import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import brandIcon from '/src/assets/Images/Logo.png';
import {
  changePassword,
  confirmSignupUser,
  loginUser,
  requestEmailVerificationOtp,
  resendSignupOtp,
  signupUser,
  verifyEmailVerificationOtp,
} from '../api/api';
import { useToastAlert } from './appToast';
import { getRouteForRole } from '../utils/userRole';
import { useSession } from './session';

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const BrandLockup = () => (
  <Link to="/" className="brand-lockup">
    <span className="brand-lockup-mark">
      <img src={brandIcon} alt="Fuel Plus logo" />
    </span>
    <span className="brand-lockup-copy">
      <strong>Fuel Plus</strong>
      <span>Fuel Management System</span>
    </span>
  </Link>
);

const PublicShell = ({ eyebrow, title, description, children }) => (
  <div className="public-shell">
    <section className="public-shell-card">
      <BrandLockup />

      <section className="public-hero-card">
        <span className="public-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      <section className="public-form-card">{children}</section>
    </section>
  </div>
);

export const LandingPage = () => (
  <div className="landing-page">
    <section className="landing-stage landing-stage--compact">
      <div className="landing-copy">
        <BrandLockup />
        <span className="public-eyebrow">Role-aware operations</span>
        <h1>One workspace. Different access. Clear operational boundaries.</h1>
        <p>
          The redesigned Fuel Plus frontend gives each user role a separate dashboard, feature set, and
          route access model so drivers, owners, operators, and admins do not share the same workflow.
        </p>

        <div className="landing-actions">
          <Link to="/login" className="primary-button">
            Log In
          </Link>
          <Link to="/signup" className="secondary-button">
            Create Vehicle Owner Account
          </Link>
        </div>
      </div>
    </section>
  </div>
);

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSessionUser } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useToastAlert(message, {
    status: 'error',
    title: 'Sign-in failed',
    idPrefix: 'login-alert',
  });

  useEffect(() => {
    if (typeof location.state?.email === 'string' && location.state.email.trim()) {
      setEmail(location.state.email.trim());
    }
  }, [location.state?.email]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const user = await loginUser({ email, password });
      setSessionUser(user);

      if (user?.mustChangePassword) {
        navigate('/change-password', { replace: true, state: { forcePasswordChange: true } });
        return;
      }

      navigate(getRouteForRole(user?.role) || '/', { replace: true });
    } catch (error) {
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

      setMessage(getErrorMessage(error, 'Login failed. Please check your credentials and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow="Sign In"
      title="Sign in to your account."
      description="Use your email and password to continue."
    >
      <div className="auth-card-header">
        <h2>Log In</h2>
        <p>Use the email and password assigned to your role.</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Email</span>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit" className="primary-button auth-submit-button" disabled={isLoading}>
          {isLoading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-inline-links">
        <span>Need a vehicle owner account?</span>
        <Link to="/signup">Create one</Link>
      </div>
    </PublicShell>
  );
};

export const SignUpPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    nicNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  useToastAlert(message, {
    status: 'error',
    title: 'Sign-up failed',
    idPrefix: 'signup-alert',
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
    setIsLoading(true);
    setMessage('');

    try {
      const response = await signupUser({ ...formData, role: 'vehicle_owner' });
      navigate('/verify-email', {
        replace: true,
        state: {
          email: formData.email,
          verificationContext: 'signup',
          signupMessage: response?.message || 'OTP sent. Verify your email to complete account creation.',
        },
      });
    } catch (error) {
      setMessage(getErrorMessage(error, 'Signup failed. Check the form values and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow="Vehicle Owner Sign-Up"
      title="Create your vehicle owner account."
      description="Sign up here to manage your vehicle and fuel quota."
    >
      <div className="auth-card-header">
        <h2>Create Account</h2>
        <p>This registration route creates a `vehicle_owner` account.</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Full Name</span>
          <input type="text" name="name" value={formData.name} onChange={handleChange} required />
        </label>

        <label className="form-field">
          <span>Phone Number</span>
          <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required />
        </label>

        <label className="form-field">
          <span>NIC Number</span>
          <input type="text" name="nicNumber" value={formData.nicNumber} onChange={handleChange} required />
        </label>

        <label className="form-field">
          <span>Email</span>
          <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        </label>

        <button type="submit" className="primary-button auth-submit-button" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>

      <div className="auth-inline-links">
        <span>Already have an account?</span>
        <Link to="/login">Sign in</Link>
      </div>
    </PublicShell>
  );
};

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(
    () => (typeof location.state?.email === 'string' ? location.state.email : ''),
    [location.state?.email],
  );
  const verificationContext = location.state?.verificationContext === 'existing' ? 'existing' : 'signup';

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState(
    location.state?.signupMessage
      || location.state?.serverMessage
      || '',
  );
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useToastAlert(message, {
    status: isError ? 'error' : 'success',
    title: isError ? 'Verification failed' : 'Verification update',
    idPrefix: 'verify-email-alert',
  });

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setMessage('');
    setIsSubmitting(true);
    setIsError(false);

    try {
      const response = verificationContext === 'signup'
        ? await confirmSignupUser(email, otp)
        : await verifyEmailVerificationOtp(email, otp);

      setMessage(response?.message || 'Verification completed. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { email },
        });
      }, 1200);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Verification failed. Please check the OTP and try again.'));
      setIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setMessage('');

    if (!email) {
      setMessage('Email is required before requesting a new OTP.');
      setIsError(true);
      return;
    }

    setIsResending(true);
    setIsError(false);

    try {
      const response = verificationContext === 'signup'
        ? await resendSignupOtp(email)
        : await requestEmailVerificationOtp(email);
      setMessage(response?.message || 'A fresh OTP has been sent.');
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to request a new OTP.'));
      setIsError(true);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <PublicShell
      eyebrow="Email Verification"
      title="Complete the verification step before opening the dashboard."
      description="Verification is part of the role onboarding flow for newly created accounts and users invited by an admin or station owner."
    >
      <div className="auth-card-header">
        <h2>Verify Email</h2>
        <p>Enter the six-digit OTP sent to your inbox.</p>
      </div>

      <form className="stack-form" onSubmit={handleVerify}>
        <label className="form-field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>

        <label className="form-field">
          <span>OTP Code</span>
          <input
            type="text"
            value={otp}
            onChange={(event) => setOtp(event.target.value)}
            maxLength={6}
            placeholder="6-digit OTP"
            required
          />
        </label>

        <button type="submit" className="primary-button auth-submit-button" disabled={isSubmitting}>
          {isSubmitting ? 'Verifying...' : 'Verify Email'}
        </button>
      </form>

      <button type="button" className="secondary-button auth-submit-button" onClick={handleResend} disabled={isResending}>
        {isResending ? 'Sending OTP...' : 'Resend OTP'}
      </button>

      <div className="auth-inline-links">
        <span>Back to login?</span>
        <Link to="/login">Sign in</Link>
      </div>
    </PublicShell>
  );
};

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setSessionUser } = useSession();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useToastAlert(message, {
    status: isError ? 'error' : 'success',
    title: isError ? 'Password update failed' : 'Password updated',
    idPrefix: 'password-alert',
  });

  const isForced = Boolean(location.state?.forcePasswordChange || user?.mustChangePassword);
  const backRoute = getRouteForRole(user?.role) || '/';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage('');

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
    setIsError(false);

    try {
      const response = await changePassword({ currentPassword, newPassword });
      const nextUser = response?.user || user;
      setSessionUser(nextUser);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage(response?.message || 'Password updated successfully.');

      if (isForced) {
        setTimeout(() => {
          navigate(getRouteForRole(nextUser?.role) || '/', { replace: true });
        }, 900);
      }
    } catch (error) {
      setMessage(getErrorMessage(error, 'Failed to update password.'));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PublicShell
      eyebrow="Password Update"
      title={isForced ? 'Change the temporary password before continuing.' : 'Update your current password.'}
      description="The backend blocks the rest of the product until invited users replace their initial password."
    >
      <div className="auth-card-header">
        <h2>Change Password</h2>
        <p>{isForced ? 'This step is mandatory before dashboard access.' : 'Use a strong new password and confirm it.'}</p>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Current Password</span>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>New Password</span>
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
        </label>

        <label className="form-field">
          <span>Confirm New Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit" className="primary-button auth-submit-button" disabled={isLoading}>
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>
      </form>

      {!isForced ? (
        <div className="auth-inline-links">
          <span>Return to your dashboard?</span>
          <Link to={backRoute}>Go back</Link>
        </div>
      ) : null}
    </PublicShell>
  );
};
