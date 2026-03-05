import { useEffect, useRef, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import Header from '../../Header/Header';
import Footer from '../../footer/footer';
import { createLocalNotification, getStationSummary, registerFuelTransaction } from '../../../api/api';
import './QRScan.css';

const initialSummary = {
  totalAvailablePetrol: 0,
  totalAvailableDiesel: 0,
  totalTransactions: 0,
  totalLitresDispensed: 0,
};

const qrFuelTypes = new Set(['petrol', 'diesel']);
const qrVehicleTypes = new Set(['car', 'bike', 'truck', 'bus', 'motorcycle', 'motorbike']);

const extractVehicleNumber = (value) => {
  const rawValue = String(value || '').trim();

  if (!rawValue) {
    return '';
  }

  const segments = rawValue
    .split('-')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (segments.length >= 3) {
    const fuelType = segments.at(-1)?.toLowerCase();
    const vehicleType = segments.at(-2)?.toLowerCase();

    if (qrFuelTypes.has(fuelType) && qrVehicleTypes.has(vehicleType)) {
      return segments.slice(0, -2).join('-');
    }
  }

  return rawValue;
};

const QRScan = () => {
  const toast = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectorRef = useRef(null);
  const detectInFlightRef = useRef(false);
  const scanPausedRef = useRef(false);

  const [cameraError, setCameraError] = useState('');
  const [scanNotice, setScanNotice] = useState('Starting camera preview...');
  const [summary, setSummary] = useState(initialSummary);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [qrPayload, setQrPayload] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [litresPumped, setLitresPumped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const loadSummary = async () => {
    try {
      const data = await getStationSummary();
      setSummary({
        totalAvailablePetrol: Number(data.totalAvailablePetrol || 0),
        totalAvailableDiesel: Number(data.totalAvailableDiesel || 0),
        totalTransactions: Number(data.totalTransactions || 0),
        totalLitresDispensed: Number(data.totalLitresDispensed || 0),
      });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to load station summary.',
      });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const scheduleDetection = () => {
    if (!detectorRef.current || scanPausedRef.current) {
      return;
    }

    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = window.requestAnimationFrame(async () => {
      if (!videoRef.current || !detectorRef.current || scanPausedRef.current) {
        return;
      }

      if (videoRef.current.readyState < 2 || detectInFlightRef.current) {
        scheduleDetection();
        return;
      }

      detectInFlightRef.current = true;

      try {
        const codes = await detectorRef.current.detect(videoRef.current);
        const matchedCode = codes.find((entry) => entry?.rawValue);

        if (matchedCode?.rawValue) {
          scanPausedRef.current = true;
          setQrPayload(matchedCode.rawValue);
          setVehicleNumber(extractVehicleNumber(matchedCode.rawValue));
          setScanNotice('QR captured. Review the vehicle number and litres before submitting.');
          detectInFlightRef.current = false;
          return;
        }
      } catch (error) {
        console.error('QR detection error:', error);
        detectorRef.current = null;
        setScanNotice('Camera preview is active. Automatic QR detection is unavailable, so paste the QR text below.');
      } finally {
        detectInFlightRef.current = false;
      }

      scheduleDetection();
    });
  };

  const resetScan = ({ keepFeedback = false } = {}) => {
    setQrPayload('');
    setVehicleNumber('');
    setLitresPumped('');

    if (!keepFeedback) {
      setFeedback(null);
    }

    scanPausedRef.current = false;

    if (detectorRef.current) {
      setScanNotice('Point the camera at the QR code.');
      scheduleDetection();
    } else if (!cameraError) {
      setScanNotice('Paste the QR text or enter the vehicle number manually.');
    }
  };

  useEffect(() => {
    let isActive = true;

    const startCamera = async () => {
      await loadSummary();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is unavailable in this browser.');
        setScanNotice('Enter the QR text or vehicle number manually.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        if ('BarcodeDetector' in window) {
          const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === 'function'
            ? await window.BarcodeDetector.getSupportedFormats()
            : ['qr_code'];

          if (supportedFormats.includes('qr_code')) {
            detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] });
            setScanNotice('Point the camera at the QR code.');
            scheduleDetection();
            return;
          }
        }

        setScanNotice('Camera preview is active. Automatic QR detection is unavailable, so paste the QR text below.');
      } catch (error) {
        console.error('Error accessing the camera:', error);
        setCameraError('Camera access is unavailable.');
        setScanNotice('Enter the QR text or vehicle number manually.');
      }
    };

    startCamera();

    return () => {
      isActive = false;

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handlePayloadChange = (event) => {
    const nextPayload = event.target.value;
    setQrPayload(nextPayload);
    setVehicleNumber(extractVehicleNumber(nextPayload));
    setFeedback(null);
    scanPausedRef.current = true;

    if (!nextPayload.trim() && detectorRef.current) {
      scanPausedRef.current = false;
      setScanNotice('Point the camera at the QR code.');
      scheduleDetection();
      return;
    }

    if (!nextPayload.trim() && !cameraError) {
      setScanNotice('Paste the QR text or enter the vehicle number manually.');
    }
  };

  const handleVehicleNumberChange = (event) => {
    setVehicleNumber(event.target.value);
    setFeedback(null);
  };

  const handleLitresChange = (event) => {
    const nextValue = event.target.value;

    if (!/^\d*(\.\d{0,2})?$/.test(nextValue)) {
      return;
    }

    setLitresPumped(nextValue);
    setFeedback(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!vehicleNumber.trim()) {
      setFeedback({ type: 'error', message: 'Scan the QR code or enter the vehicle number first.' });
      return;
    }

    if (!litresPumped) {
      setFeedback({ type: 'error', message: 'Enter the litres pumped before saving the transaction.' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const response = await registerFuelTransaction({
        vehicleNumber,
        qrData: qrPayload,
        litresPumped,
      });

      await loadSummary();

      const successMessage = `${response.litresPumped}L of ${response.fuelType} recorded for ${response.vehicleNumber}. Available ${response.fuelType} stock was reduced automatically.`;

      await createLocalNotification({
        type: 'fuel_transaction',
        title: 'Fuel transaction recorded',
        message: `${response.litresPumped}L of ${response.fuelType} was recorded for ${response.vehicleNumber} at ${response.stationName}.`,
        status: 'completed',
        vehicle: response.vehicle
          ? {
              _id: response.vehicle,
              vehicleNumber: response.vehicleNumber,
            }
          : null,
      });

      setFeedback({
        type: 'success',
        message: successMessage,
      });
      toast({
        id: `transaction-${response._id || Date.now()}`,
        title: 'Transaction saved',
        description: successMessage,
        status: 'success',
        duration: 6000,
        isClosable: true,
        position: 'top-right',
        variant: 'subtle',
      });

      resetScan({ keepFeedback: true });
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.response?.data?.message || 'Failed to register the fuel transaction.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="page-shell">
        <section className="scan-grid rise-in">
          <div className="panel scan-copy">
            <span className="section-badge">QR Scan</span>
            <h1>Register a fuel transaction</h1>
            <p className="lead-text">Scan the vehicle QR, enter litres pumped, and the matching petrol or diesel stock will be reduced automatically.</p>

            <div className="scan-summary-grid">
              <div className="metric-card">
                <div className="metric-label">Petrol available</div>
                <div className="metric-value">{isSummaryLoading ? '...' : `${summary.totalAvailablePetrol}L`}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Diesel available</div>
                <div className="metric-value">{isSummaryLoading ? '...' : `${summary.totalAvailableDiesel}L`}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Transactions</div>
                <div className="metric-value">{isSummaryLoading ? '...' : summary.totalTransactions}</div>
              </div>
              <div className="metric-card">
                <div className="metric-label">Dispensed</div>
                <div className="metric-value">{isSummaryLoading ? '...' : `${summary.totalLitresDispensed}L`}</div>
              </div>
            </div>

            <form className="scan-form" onSubmit={handleSubmit}>
              <label className="field-group">
                <span>QR payload</span>
                <textarea
                  value={qrPayload}
                  onChange={handlePayloadChange}
                  placeholder="Scan the QR code or paste the QR value here"
                  rows={3}
                />
              </label>

              <label className="field-group">
                <span>Vehicle number</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={handleVehicleNumberChange}
                  placeholder="Vehicle number"
                  autoComplete="off"
                />
              </label>

              <label className="field-group">
                <span>Litres pumped</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={litresPumped}
                  onChange={handleLitresChange}
                  placeholder="0.00"
                />
              </label>

              <div className="scan-actions">
                <button type="submit" className="button scan-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Record transaction'}
                </button>
                <button type="button" className="secondary-button scan-button" onClick={resetScan}>
                  Reset
                </button>
              </div>
            </form>

            {feedback ? (
              <div className={`response-banner${feedback.type === 'error' ? ' error-banner' : ''}`}>
                {feedback.message}
              </div>
            ) : null}
          </div>

          <div className="panel scan-preview">
            <div className="video-frame">
              <video ref={videoRef} autoPlay playsInline muted className="video-feed" />
            </div>
            <p className="inline-note">{cameraError || scanNotice}</p>

            <div className="scan-details">
              <div className="scan-detail-card">
                <span className="metric-label">Detected vehicle</span>
                <strong>{vehicleNumber || 'Waiting for scan'}</strong>
              </div>
              <div className="scan-detail-card">
                <span className="metric-label">Last QR payload</span>
                <strong>{qrPayload || 'No QR captured yet'}</strong>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default QRScan;
