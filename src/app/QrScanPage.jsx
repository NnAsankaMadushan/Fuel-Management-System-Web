import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createLocalNotification,
  getStationSummary,
  registerFuelTransaction,
} from '../api/api';
import { useToastAlert } from './appToast';
import { compactNumber, formatFuel, getErrorMessage, KeyValue, MetricCard, Panel } from './ProtectedShared';

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
    return segments.slice(0, -2).join('-');
  }

  return rawValue;
};

export const QRScanPage = () => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const detectorRef = useRef(null);
  const detectInFlightRef = useRef(false);
  const scanPausedRef = useRef(false);

  const [cameraError, setCameraError] = useState('');
  const [scanNotice, setScanNotice] = useState('Starting camera preview...');
  const [summary, setSummary] = useState({
    totalAvailablePetrol: 0,
    totalAvailableDiesel: 0,
    totalTransactions: 0,
    totalLitresDispensed: 0,
  });
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [qrPayload, setQrPayload] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [litresPumped, setLitresPumped] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackIsError, setFeedbackIsError] = useState(false);

  useToastAlert(feedback, {
    status: feedbackIsError ? 'error' : 'success',
    title: feedbackIsError ? 'Transaction failed' : 'Transaction recorded',
    idPrefix: 'qr-scan-feedback',
  });

  const loadSummary = useCallback(async () => {
    try {
      const data = await getStationSummary();
      setSummary({
        totalAvailablePetrol: Number(data.totalAvailablePetrol || 0),
        totalAvailableDiesel: Number(data.totalAvailableDiesel || 0),
        totalTransactions: Number(data.totalTransactions || 0),
        totalLitresDispensed: Number(data.totalLitresDispensed || 0),
      });
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to load station summary.'));
      setFeedbackIsError(true);
    } finally {
      setIsSummaryLoading(false);
    }
  }, []);

  const scheduleDetection = useCallback(() => {
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
          setScanNotice('QR captured. Confirm litres pumped and submit the transaction.');
          detectInFlightRef.current = false;
          return;
        }
      } catch (error) {
        console.error('QR detection error:', error);
        detectorRef.current = null;
        setScanNotice('Automatic QR detection is unavailable. Paste the QR text manually.');
      } finally {
        detectInFlightRef.current = false;
      }

      scheduleDetection();
    });
  }, []);

  const resetScan = useCallback(
    ({ keepFeedback = false } = {}) => {
      setQrPayload('');
      setVehicleNumber('');
      setLitresPumped('');

      if (!keepFeedback) {
        setFeedback('');
      }

      setFeedbackIsError(false);
      scanPausedRef.current = false;

      if (detectorRef.current) {
        setScanNotice('Point the camera at the QR code.');
        scheduleDetection();
      } else if (!cameraError) {
        setScanNotice('Paste the QR text or enter the vehicle number manually.');
      }
    },
    [cameraError, scheduleDetection],
  );

  useEffect(() => {
    let active = true;

    const startCamera = async () => {
      await loadSummary();

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera access is unavailable in this browser.');
        setScanNotice('Paste the QR text or enter the vehicle number manually.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        });

        if (!active) {
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

        setScanNotice('Camera preview is active. Paste the QR text if the browser cannot decode it automatically.');
      } catch (error) {
        console.error('Camera error:', error);
        setCameraError('Camera access is unavailable.');
        setScanNotice('Paste the QR text or enter the vehicle number manually.');
      }
    };

    startCamera();

    return () => {
      active = false;

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [loadSummary, scheduleDetection]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');
    setFeedbackIsError(false);

    if (!vehicleNumber.trim()) {
      setFeedback('Scan the QR or enter the vehicle number first.');
      setFeedbackIsError(true);
      return;
    }

    if (!litresPumped) {
      setFeedback('Enter the litres pumped before saving the transaction.');
      setFeedbackIsError(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await registerFuelTransaction({
        vehicleNumber,
        qrData: qrPayload,
        litresPumped,
      });

      await loadSummary();
      await createLocalNotification({
        type: 'fuel_transaction',
        title: 'Fuel transaction recorded',
        message: `${response.litresPumped}L of ${response.fuelType} recorded for ${response.vehicleNumber} at ${response.stationName}.`,
        status: 'completed',
        vehicle: response.vehicle
          ? {
              _id: response.vehicle,
              vehicleNumber: response.vehicleNumber,
            }
          : null,
      });

      setFeedback(`${response.litresPumped}L recorded for ${response.vehicleNumber}. Station stock updated automatically.`);
      setFeedbackIsError(false);
      resetScan({ keepFeedback: true });
    } catch (error) {
      setFeedback(getErrorMessage(error, 'Failed to register the fuel transaction.'));
      setFeedbackIsError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <section className="hero-metrics-grid">
        <MetricCard tone="blue" label="Petrol" value={isSummaryLoading ? '...' : formatFuel(summary.totalAvailablePetrol)} note="Available stock" />
        <MetricCard tone="amber" label="Diesel" value={isSummaryLoading ? '...' : formatFuel(summary.totalAvailableDiesel)} note="Available stock" />
        <MetricCard tone="teal" label="Transactions" value={isSummaryLoading ? '...' : compactNumber(summary.totalTransactions)} note="Recent seven-day count" />
        <MetricCard tone="violet" label="Dispensed" value={isSummaryLoading ? '...' : formatFuel(summary.totalLitresDispensed)} note="Recent seven-day litres" />
      </section>

      <section className="two-column-grid">
        <Panel eyebrow="Transaction Form" title="Register fuel transaction" description="Capture the QR payload, review the vehicle number, and submit litres pumped.">
          <form className="stack-form" onSubmit={handleSubmit}>
            <label className="form-field">
              <span>QR Payload</span>
              <textarea
                value={qrPayload}
                onChange={(event) => {
                  const nextPayload = event.target.value;
                  setQrPayload(nextPayload);
                  setVehicleNumber(extractVehicleNumber(nextPayload));
                  scanPausedRef.current = true;
                }}
                rows={4}
                placeholder="Scan the QR code or paste the QR value here"
              />
            </label>

            <label className="form-field">
              <span>Vehicle Number</span>
              <input
                value={vehicleNumber}
                onChange={(event) => setVehicleNumber(event.target.value)}
                placeholder="Vehicle number"
              />
            </label>

            <label className="form-field">
              <span>Litres Pumped</span>
              <input
                value={litresPumped}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (/^\d*(\.\d{0,2})?$/.test(nextValue)) {
                    setLitresPumped(nextValue);
                  }
                }}
                placeholder="0.00"
              />
            </label>

            <div className="button-row">
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Transaction'}
              </button>
              <button type="button" className="secondary-button" onClick={() => resetScan()}>
                Reset
              </button>
            </div>
          </form>
        </Panel>

        <Panel eyebrow="Camera Preview" title="Live scanner" description="Use the browser camera when available or fall back to pasted QR text.">
          <div className="video-shell">
            <video ref={videoRef} autoPlay playsInline muted className="video-element" />
          </div>

          <div className="detail-stack">
            <KeyValue label="Camera status" value={cameraError || scanNotice} />
            <KeyValue label="Detected vehicle" value={vehicleNumber || 'Waiting for scan'} />
            <KeyValue label="Last QR payload" value={qrPayload || 'No QR payload captured yet'} />
          </div>
        </Panel>
      </section>
    </div>
  );
};
