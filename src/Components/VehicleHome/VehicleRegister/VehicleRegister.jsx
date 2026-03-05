import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import { getStoredSessionUser } from '../../../api/api';
import './VehicleRegister.css';

const formatVehicleNumberInput = (value) =>
  value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').trimStart();

const vehicleTypeOptions = [
  { label: 'Car', value: 'car' },
  { label: 'Motorcycle', value: 'bike' },
  { label: 'Truck', value: 'truck' },
  { label: 'Bus', value: 'bus' },
];

const fuelTypeOptions = [
  { label: 'Petrol', value: 'petrol' },
  { label: 'Diesel', value: 'diesel' },
];

const VehicleRegister = () => {
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [fuelType, setFuelType] = useState('');
  const [registryDetails, setRegistryDetails] = useState({
    engineNumber: '',
    chassisNumber: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const navigate = useNavigate();

  const handleVehicleNumberChange = (event) => {
    setVehicleNumber(formatVehicleNumberInput(event.target.value));
  };

  const handleRegistryDetailChange = (field) => (event) => {
    setRegistryDetails((current) => ({
      ...current,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setResponseMessage('');
    setIsError(false);

    const formattedVehicleNumber = vehicleNumber.trim();

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          vehicleNumber: formattedVehicleNumber,
          vehicleType,
          fuelType,
          ...registryDetails,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setVehicleNumber('');
        setVehicleType('');
        setFuelType('');
        setRegistryDetails({
          engineNumber: '',
          chassisNumber: '',
        });
        setResponseMessage(data.message || 'Vehicle registered successfully. Redirecting to your dashboard...');
        setTimeout(() => {
          const currentUser = getStoredSessionUser();
          const destination = currentUser?.role === 'station_operator' ? '/o-home' : '/vehicleHome';
          navigate(destination);
        }, 1200);
      } else {
        setIsError(true);
        setResponseMessage(data.message || 'Error registering vehicle.');
      }
    } catch {
      setIsError(true);
      setResponseMessage('Error registering vehicle.');
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
            <span className="section-badge">Vehicle Registration</span>
            <h1>Register a vehicle</h1>
            <p className="lead-text">
              Enter the vehicle number, vehicle type, and fuel type. If the plate is not already in the
              registry, provide the engine and chassis numbers below.
            </p>

            <form className="app-form" onSubmit={handleSubmit}>
              <label className="field-group">
                <span>Vehicle number</span>
                <input
                  type="text"
                  placeholder="ABC 1234"
                  value={vehicleNumber}
                  onChange={handleVehicleNumberChange}
                  required
                />
              </label>

              <div className="field-grid">
                <label className="field-group">
                  <span>Vehicle type</span>
                  <select value={vehicleType} onChange={(event) => setVehicleType(event.target.value)} required>
                    <option value="">Select vehicle type</option>
                    {vehicleTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field-group">
                  <span>Fuel type</span>
                  <select value={fuelType} onChange={(event) => setFuelType(event.target.value)} required>
                    <option value="">Select fuel type</option>
                    {fuelTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="registry-details-card">
                <div className="registry-details-copy">
                  <strong>Additional registry details</strong>
                  <p>Required only when the vehicle number is not already in the registry.</p>
                </div>

                <div className="field-grid">
                  <label className="field-group">
                    <span>Engine number</span>
                    <input
                      type="text"
                      placeholder="ENG-NC8899-2017"
                      value={registryDetails.engineNumber}
                      onChange={handleRegistryDetailChange('engineNumber')}
                    />
                  </label>

                  <label className="field-group">
                    <span>Chassis number</span>
                    <input
                      type="text"
                      placeholder="CHS-NC8899-2017"
                      value={registryDetails.chassisNumber}
                      onChange={handleRegistryDetailChange('chassisNumber')}
                    />
                  </label>
                </div>
              </div>

              <button className="button form-submit-button" type="submit" disabled={isLoading}>
                {isLoading ? 'Registering...' : 'Register Vehicle'}
              </button>
            </form>

            {responseMessage ? (
              <p className={`response-banner ${isError ? 'error-banner' : ''}`}>
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

export default VehicleRegister;
