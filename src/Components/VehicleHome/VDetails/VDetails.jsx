import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import './VDetails.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { QRCodeCanvas } from 'qrcode.react';

const getVehicleStatus = (vehicle) => vehicle?.verificationStatus || (vehicle?.isVerified ? 'approved' : 'pending');

const formatStatus = (status) => {
  const normalizedStatus = String(status || 'pending').toLowerCase();
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
};

const VDetails = () => {
  const { id } = useParams();
  const qrWrapperRef = useRef(null);
  const [vehicle, setVehicle] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/vehicles/${id}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }

        const data = await response.json();
        setVehicle(data);
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVehicle();
  }, [id]);

  const downloadQRCode = () => {
    if (isStoredQrImage) {
      const link = document.createElement('a');
      link.href = qrValue;
      link.download = `vehicle-${vehicle?.vehicleNumber || 'qrcode'}.png`;
      link.click();
      return;
    }

    const qrCanvas = qrWrapperRef.current?.querySelector('canvas');
    if (!qrCanvas) {
      return;
    }

    const link = document.createElement('a');
    link.href = qrCanvas.toDataURL('image/png');
    link.download = `vehicle-${vehicle?.vehicleNumber || 'qrcode'}.png`;
    link.click();
  };

  const status = getVehicleStatus(vehicle);
  const quotaPercent = vehicle?.allocatedQuota ? Math.round((vehicle.remainingQuota / vehicle.allocatedQuota) * 100) : 0;
  const qrValue = vehicle?.qrCode || vehicle?.vehicleNumber || '';
  const isStoredQrImage = typeof qrValue === 'string' && qrValue.startsWith('data:image');
  const canUseQr = status === 'approved';

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        {isLoading ? (
          <div className="empty-state">Loading vehicle details...</div>
        ) : error ? (
          <div className="response-banner error-banner">{error}</div>
        ) : vehicle ? (
          <>
            <section className="details-hero panel rise-in">
              <div>
                <span className="section-badge">Vehicle Details</span>
                <h1>{vehicle.vehicleNumber}</h1>
                <p className="lead-text">Vehicle details, approval status, and QR access.</p>
              </div>

              <div className="summary-grid">
                <div className="metric-card">
                  <div className="metric-label">Fuel type</div>
                  <div className="metric-value">{vehicle.fuelType || 'N/A'}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Remaining quota</div>
                  <div className="metric-value">{vehicle.remainingQuota || 0}L</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Status</div>
                  <div className="metric-value">
                    <span className={`status-chip status-chip--${status}`}>{formatStatus(status)}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="progress-shell page-section">
              <div className="panel details-progress-panel">
                <span className="section-badge">Quota Snapshot</span>
                <h2>Quota</h2>
                <div className="details-progress-ring">
                  <CircularProgressbar
                    value={quotaPercent}
                    text={`${vehicle.remainingQuota || 0}L`}
                    styles={buildStyles({
                      textColor: '#dd5b11',
                      pathColor: '#f97316',
                      trailColor: '#f2e7da',
                    })}
                  />
                </div>
                <div className="details-stack">
                  <div className="info-item">
                    <strong>Allocated quota</strong>
                    <p>{vehicle.allocatedQuota || 0}L</p>
                  </div>
                  <div className="info-item">
                    <strong>Used quota</strong>
                    <p>{vehicle.usedQuota || 0}L</p>
                  </div>
                  <div className="info-item">
                    <strong>Admin note</strong>
                    <p>
                      {vehicle.approvalNote ||
                        (status === 'pending'
                          ? 'Waiting for admin approval.'
                          : 'No admin note is available for this vehicle.')}
                    </p>
                  </div>
                  <div className="info-item">
                    <strong>Last reviewed</strong>
                    <p>{vehicle.reviewedAt ? new Date(vehicle.reviewedAt).toLocaleString() : 'Not reviewed yet'}</p>
                  </div>
                </div>
              </div>

              <div className="panel qr-details-panel">
                <div className="qr-panel-copy">
                  <span className="section-badge">QR Access</span>
                  <h2>QR code</h2>
                </div>
                {canUseQr && qrValue ? (
                  <div className="qr-stack">
                    <div ref={qrWrapperRef} className="qr-card">
                      {isStoredQrImage ? (
                        <img src={qrValue} alt={`QR code for ${vehicle.vehicleNumber}`} className="qr-image" />
                      ) : (
                        <QRCodeCanvas
                          value={qrValue}
                          size={280}
                          title="Fuel quota QR Code"
                          includeMargin
                          level="M"
                        />
                      )}
                    </div>
                    <button className="button qr-download-button" type="button" onClick={downloadQRCode}>
                      Download QR
                    </button>
                  </div>
                ) : (
                  <div className="empty-state">
                    {status === 'pending'
                      ? 'QR access will be available after admin approval.'
                      : 'This vehicle was rejected. QR access is disabled until it is approved.'}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <div className="empty-state">Vehicle details are unavailable.</div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default VDetails;
