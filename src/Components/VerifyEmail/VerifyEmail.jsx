import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
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
  const toast = useToast();
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

  const showFeedbackToast = useCallback(
    ({ title, description, status = 'info' }) => {
      const toastId = 'verify-email-feedback';

      if (toast.isActive(toastId)) {
        toast.close(toastId);
      }

      toast({
        id: toastId,
        title,
        description,
        status,
        duration: status === 'success' ? 2200 : 3200,
        isClosable: true,
        position: 'top-right',
      });
    },
    [toast],
  );

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (initialMessage) {
      showFeedbackToast({
        title: verificationContext === 'signup' ? 'Verify your email' : 'Email verification required',
        description: initialMessage,
        status: 'info',
      });
    }
  }, [initialMessage, showFeedbackToast, verificationContext]);

  const handleVerify = async (event) => {
    event.preventDefault();

    if (!email || !otp) {
      showFeedbackToast({
        title: 'Missing details',
        description: 'Email and OTP are required.',
        status: 'error',
      });
      return;
    }

    try {
      setIsVerifying(true);
      const response = verificationContext === 'signup'
        ? await confirmSignupUser(email, otp)
        : await verifyEmailVerificationOtp(email, otp);
      showFeedbackToast({
        title: 'Verification successful',
        description: response?.message || 'Verification completed. Redirecting to login...',
        status: 'success',
      });
      setTimeout(() => {
        navigate('/login', {
          replace: true,
          state: { email },
        });
      }, 1200);
    } catch (error) {
      console.error('Email verification failed:', error);
      showFeedbackToast({
        title: 'Verification failed',
        description: error?.response?.data?.message || 'Email verification failed.',
        status: 'error',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email) {
      showFeedbackToast({
        title: 'Email required',
        description: 'Enter your email to request a new OTP.',
        status: 'error',
      });
      return;
    }

    try {
      setIsResending(true);
      const response = verificationContext === 'signup'
        ? await resendSignupOtp(email)
        : await requestEmailVerificationOtp(email);
      showFeedbackToast({
        title: 'OTP sent',
        description: response?.message || 'A new OTP has been sent.',
        status: 'success',
      });
    } catch (error) {
      console.error('Resend OTP failed:', error);
      showFeedbackToast({
        title: 'Request failed',
        description: error?.response?.data?.message || 'Failed to request a new OTP.',
        status: 'error',
      });
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
        </div>
      </section>
    </main>
  );
};

export default VerifyEmail;
