/* eslint-disable react/prop-types */
import { useEffect, useRef } from 'react';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import './FuelQuota.css';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import JsBarcode from 'jsbarcode';

const FuelQuota = ({ vehicle }) => {
  const barcodeRef = useRef(null);

  useEffect(() => {
    if (barcodeRef.current && vehicle?.qrCode) {
      JsBarcode(barcodeRef.current, vehicle.qrCode, {
        format: 'CODE128',
        width: 2,
        height: 90,
        displayValue: true,
      });
    }
  }, [vehicle?.qrCode]);

  if (!vehicle) {
    return (
      <div className="app-shell">
        <Header />
        <main className="page-shell">
          <div className="empty-state">Open this page from a vehicle record.</div>
        </main>
        <Footer />
      </div>
    );
  }

  const quotaPercent = vehicle.allocatedQuota
    ? Math.round((vehicle.remainingQuota / vehicle.allocatedQuota) * 100)
    : 0;

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="quota-hero panel rise-in">
          <div>
            <span className="section-badge">Fuel Quota</span>
            <h1>{vehicle.vehicleNumber}</h1>
            <p className="lead-text">Quota details for this vehicle.</p>
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
          </div>
        </section>

        <section className="progress-shell page-section">
          <div className="panel details-progress-panel">
            <span className="section-badge">Usage</span>
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
            </div>
          </div>

          <div className="panel qr-details-panel">
            <span className="section-badge">Barcode</span>
            <h2>Reference code</h2>
            <svg ref={barcodeRef} className="barcode-visual"></svg>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default FuelQuota;
