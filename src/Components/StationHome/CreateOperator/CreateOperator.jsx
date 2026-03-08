import { useEffect, useState } from 'react';
import './CreateOperator.css';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import { useNavigate } from 'react-router-dom';
import { getMyStations } from '../../../api/api';

const CreateOperator = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phoneNumber: '',
    nicNumber: '',
  });
  const [responseMessage, setResponseMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStations, setIsCheckingStations] = useState(true);
  const [hasRegisteredStation, setHasRegisteredStation] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadStations = async () => {
      try {
        const stationList = await getMyStations();
        setHasRegisteredStation(Array.isArray(stationList) && stationList.length > 0);
      } catch {
        setHasRegisteredStation(false);
      } finally {
        setIsCheckingStations(false);
      }
    };

    loadStations();
  }, []);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!hasRegisteredStation) {
      setResponseMessage('Error: Register a station first to create an operator.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stations/addStationOperator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (response.ok) {
        setResponseMessage('Operator added successfully. They must change this temporary password on first login.');
        setTimeout(() => {
          navigate('/s-home');
        }, 1200);
      } else {
        setResponseMessage(data.message || 'Error adding operator.');
      }
    } catch {
      setResponseMessage('Error adding operator.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="form-shell form-shell--single rise-in">
          <div className="form-panel panel">
            <span className="section-badge">Operator Onboarding</span>
            <h1>Create a station operator</h1>
            <p className="lead-text">Enter the operator details.</p>

            <form className="app-form" onSubmit={handleSubmit}>
              <div className="field-grid">
                <label className="field-group">
                  <span>Full name</span>
                  <input type="text" name="name" placeholder="Operator name" value={formData.name} onChange={handleChange} required />
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
                <span>Email address</span>
                <input type="email" name="email" placeholder="operator@example.com" value={formData.email} onChange={handleChange} required />
              </label>

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
                <span>Temporary password</span>
                <input type="password" name="password" placeholder="Set an initial password" value={formData.password} onChange={handleChange} required />
              </label>

              <button
                type="submit"
                className="button form-submit-button"
                disabled={isLoading || isCheckingStations || !hasRegisteredStation}
              >
                {isLoading ? 'Registering...' : 'Create Operator'}
              </button>
            </form>

            {!isCheckingStations && !hasRegisteredStation ? (
              <p className="response-banner error-banner">Register a station first to create an operator.</p>
            ) : null}

            {responseMessage ? (
              <p className={`response-banner ${responseMessage.includes('Error') ? 'error-banner' : ''}`}>
                {responseMessage}
              </p>
            ) : null}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default CreateOperator;
