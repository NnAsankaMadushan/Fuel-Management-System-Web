import { useState } from 'react';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import './StationRegister.css';
import { useNavigate } from 'react-router-dom';

const StationRegister = () => {
  const [stationName, setStationName] = useState('');
  const [location, setLocation] = useState('');
  const [stationRegNumber, setStationRegNumber] = useState('');
  const [responseMessage, setResponseMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/stations/registerStation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          stationName,
          location,
          station_regNumber: stationRegNumber,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResponseMessage('Station registered successfully. Redirecting to station home...');
        setTimeout(() => {
          navigate('/s-home');
        }, 1200);
      } else {
        setResponseMessage(data.message || 'Error registering station.');
      }
    } catch {
      setResponseMessage('Error registering station.');
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
            <span className="section-badge">Station Registration</span>
            <h1>Create a station record</h1>
            <p className="lead-text">Enter the station details.</p>

            <form className="app-form" onSubmit={handleSubmit}>
              <label className="field-group">
                <span>Station name</span>
                <input
                  type="text"
                  placeholder="FuelPlus Galle"
                  value={stationName}
                  onChange={(event) => setStationName(event.target.value)}
                  required
                />
              </label>

              <div className="field-grid">
                <label className="field-group">
                  <span>Location</span>
                  <input
                    type="text"
                    placeholder="Galle"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    required
                  />
                </label>

                <label className="field-group">
                  <span>Station registration number</span>
                  <input
                    type="text"
                    placeholder="ST-0001"
                    value={stationRegNumber}
                    onChange={(event) => setStationRegNumber(event.target.value)}
                    required
                  />
                </label>
              </div>

              <button className="button form-submit-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register Station'}
              </button>
            </form>

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

export default StationRegister;
