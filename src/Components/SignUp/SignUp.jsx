import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../Auth/Auth.css';
import { signupUser } from '../../api/api';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    nicNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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
      await signupUser({ ...formData, role: 'vehicle_owner' });
      setMessage('Account created successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (error) {
      console.error('Signup failed:', error);
      setMessage(error.response?.data?.message || 'Signup failed. Check the form values and try again.');
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
            <h1>Create account</h1>
            <p className="auth-subtitle">Fill in the form to create your vehicle owner account.</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="field-grid">
              <label className="field-group">
                <span>Full name</span>
                <input type="text" name="name" placeholder="Your name" value={formData.name} onChange={handleChange} required />
              </label>

              <label className="field-group">
                <span>Phone number</span>
                <input
                  type="text"
                  name="phoneNumber"
                  placeholder="0771234567"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <label className="field-group">
              <span>NIC number</span>
              <input
                type="text"
                name="nicNumber"
                placeholder="200012345678 or 123456789V"
                value={formData.nicNumber}
                onChange={handleChange}
                required
              />
            </label>

            <label className="field-group">
              <span>Email address</span>
              <input type="email" name="email" placeholder="you@example.com" value={formData.email} onChange={handleChange} required />
            </label>

            <label className="field-group">
              <span>Password</span>
              <input type="password" name="password" placeholder="Create a password" value={formData.password} onChange={handleChange} required />
            </label>

            <button className="button auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-actions">
            <span className="inline-note">Already have an account?</span>
            <Link to="/login" className="text-link">
              Sign in
            </Link>
          </div>

          {message ? (
            <p className={`response-banner ${message.includes('failed') ? 'error-banner' : ''}`}>{message}</p>
          ) : null}
        </div>
      </section>
    </main>
  );
};

export default SignUp;
