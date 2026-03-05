import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import '../Auth/Auth.css';
import {
  confirmSignupUser,
  requestEmailVerificationOtp,
  resendSignupOtp,
  verifyEmailVerificationOtp,
} from '../../api/api';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = useMemo(() => {
    const value = location.state?.email;
    return typeof value === 'string' ? value : '';
  }, [location.state?.email]);
  const verificationContext = useMemo(
    () => (location.state?.verificationContext === 'existing' ? 'existing' : 'signup'),
    [location.state?.verificationContext],
  );
  const initialMessage = useMemo(() => {
    const defaultMessage =
      verificationContext === 'signup'
        ? 'Enter the OTP sent to your email to complete account creation.'
        : 'Enter the OTP sent to your email to verify your account.';
    const baseMessage =
      location.state?.signupMessage ||
      location.state?.serverMessage ||
      defaultMessage;
    return baseMessage;
  }, [location.state?.serverMessage, location.state?.signupMessage, verificationContext]);

  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState(initialMessage);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    setMessage(initialMessage);
    setHasError(false);
  }, [initialMessage]);

  const handleVerify = async (event) => {
    event.preventDefault();
    setHasError(false);
    setMessage('');

    if (!email || !otp) {
      setHasError(true);
      setMessage('Email and OTP are required.');
      return;
    }

    try {
      setIsVerifying(true);
      const response = verificationContext === 'signup'
        ? await confirmSignupUser(email, otp)
        : await verifyEmailVerificationOtp(email, otp);
      setHasError(false);
      setMessage(response?.message || 'Verification completed. Redirecting to login...');
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { email },
        });
      }, 1200);
    } catch (error) {
      console.error('Email verification failed:', error);
      setHasError(true);
      setMessage(error?.response?.data?.message || 'Email verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setHasError(false);
    setMessage('');

    if (!email) {
      setHasError(true);
      setMessage('Enter your email to request a new OTP.');
      return;
    }

    try {
      setIsResending(true);
      const response = verificationContext === 'signup'
        ? await resendSignupOtp(email)
        : await requestEmailVerificationOtp(email);
      setHasError(false);
      setMessage(response?.message || 'A new OTP has been sent.');
    } catch (error) {
      console.error('Resend OTP failed:', error);
      setHasError(true);
      setMessage(error?.response?.data?.message || 'Failed to request a new OTP.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-shell auth-shell--compact panel rise-in">
        <div className="auth-panel auth-panel--solo">
          <span className="auth-brand">FuelPlus</span>
          <div>
            <h1>Verify email</h1>
            <p className="auth-subtitle">Enter your 6-digit OTP to finish account verification.</p>
          </div>

          <form className="auth-form" onSubmit={handleVerify}>
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
              <span>OTP</span>
              <input
                type="text"
                placeholder="6-digit code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={6}
                required
              />
            </label>

            <button className="button auth-submit" type="submit" disabled={isVerifying}>
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </button>
          </form>

          <button
            className="button auth-submit"
            type="button"
            onClick={handleResendOtp}
            disabled={isResending}
          >
            {isResending ? 'Sending OTP...' : 'Resend OTP'}
          </button>

          <div className="auth-actions">
            <span className="inline-note">Already verified?</span>
            <Link to="/login" className="text-link">
              Sign in
            </Link>
          </div>

          {message ? (
            <p className={`response-banner ${hasError ? 'error-banner' : ''}`}>{message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default VerifyEmail;
