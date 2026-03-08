import { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Link } from 'react-router-dom';

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

export const chartColors = {
  teal: '#118a78',
  tealSoft: 'rgba(17, 138, 120, 0.16)',
  blue: '#2f6fed',
  blueSoft: 'rgba(47, 111, 237, 0.16)',
  amber: '#f08b37',
  rose: '#de5b74',
  violet: '#8d6adf',
};

export const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 10,
        color: '#415261',
      },
    },
    tooltip: {
      backgroundColor: '#10202b',
      titleColor: '#f4f7fb',
      bodyColor: '#f4f7fb',
      padding: 12,
      cornerRadius: 12,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
      ticks: {
        color: '#5b6d7d',
      },
    },
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(37, 54, 70, 0.08)',
      },
      ticks: {
        color: '#5b6d7d',
      },
    },
  },
};

export const compactNumber = (value) => new Intl.NumberFormat('en-US', { notation: 'compact' }).format(Number(value || 0));

export const formatFuel = (value) => `${Number(value || 0).toLocaleString()} L`;

export const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'N/A';

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'N/A';

export const formatStatus = (value) => {
  const normalized = String(value || 'pending').replace(/_/g, ' ').trim();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const getVehicleStatus = (vehicle) => vehicle?.verificationStatus || (vehicle?.isVerified ? 'approved' : 'pending');

export const getStationStatus = (station) => {
  if (station?.verificationStatus) {
    return station.verificationStatus;
  }

  if (typeof station?.isVerified === 'boolean') {
    return station.isVerified ? 'approved' : 'pending';
  }

  return 'approved';
};

export const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const formatLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildMonthlySeries = (items = [], months = 6) => {
  const buckets = [];
  const current = new Date();
  current.setDate(1);
  current.setHours(0, 0, 0, 0);

  for (let index = months - 1; index >= 0; index -= 1) {
    const monthDate = new Date(current.getFullYear(), current.getMonth() - index, 1);
    buckets.push({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: monthDate.toLocaleDateString(undefined, { month: 'short' }),
      count: 0,
    });
  }

  items.forEach((item) => {
    const value = new Date(item?.createdAt || item?.date || item?.updatedAt || '');
    if (Number.isNaN(value.getTime())) {
      return;
    }

    const key = `${value.getFullYear()}-${value.getMonth()}`;
    const bucket = buckets.find((entry) => entry.key === key);
    if (bucket) {
      bucket.count += 1;
    }
  });

  return {
    labels: buckets.map((entry) => entry.label),
    values: buckets.map((entry) => entry.count),
  };
};

export const buildDailyFuelSeries = (logs = [], days = 7) => {
  const entries = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (days - 1));

  for (let index = 0; index < days; index += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + index);
    entries.push({
      key: formatLocalDateKey(current),
      label: current.toLocaleDateString(undefined, { weekday: 'short' }),
      litres: 0,
    });
  }

  logs.forEach((log) => {
    const value = new Date(log?.date || log?.createdAt || '');
    if (Number.isNaN(value.getTime())) {
      return;
    }

    const key = formatLocalDateKey(value);
    const entry = entries.find((item) => item.key === key);
    if (entry) {
      entry.litres += Number(log?.litresPumped || 0);
    }
  });

  return entries;
};

const createInitialActionDialogState = () => ({
  isOpen: false,
  mode: 'confirm',
  title: '',
  message: '',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  variant: 'default',
  eyebrow: '',
  promptLabel: 'Note',
  promptHint: '',
  placeholder: '',
  resolver: null,
});

export const useActionDialog = () => {
  const [dialog, setDialog] = useState(createInitialActionDialogState);
  const [promptValue, setPromptValue] = useState('');

  const closeActionDialog = useCallback((result) => {
    setDialog((current) => {
      if (typeof current.resolver === 'function') {
        current.resolver(result);
      }

      return createInitialActionDialogState();
    });
    setPromptValue('');
  }, []);

  const openConfirmDialog = useCallback(
    ({
      title = 'Confirm action',
      message = '',
      confirmLabel = 'Confirm',
      cancelLabel = 'Cancel',
      variant = 'default',
      eyebrow = '',
    }) =>
      new Promise((resolve) => {
        setPromptValue('');
        setDialog({
          isOpen: true,
          mode: 'confirm',
          title,
          message,
          confirmLabel,
          cancelLabel,
          variant,
          eyebrow,
          promptLabel: 'Note',
          promptHint: '',
          placeholder: '',
          resolver: resolve,
        });
      }),
    [],
  );

  const openPromptDialog = useCallback(
    ({
      title = 'Add a note',
      message = '',
      defaultValue = '',
      promptLabel = 'Note',
      promptHint = '',
      placeholder = '',
      confirmLabel = 'Save',
      cancelLabel = 'Cancel',
      variant = 'default',
      eyebrow = '',
    }) =>
      new Promise((resolve) => {
        setPromptValue(defaultValue);
        setDialog({
          isOpen: true,
          mode: 'prompt',
          title,
          message,
          confirmLabel,
          cancelLabel,
          variant,
          eyebrow,
          promptLabel,
          promptHint,
          placeholder,
          resolver: resolve,
        });
      }),
    [],
  );

  return {
    actionDialog: dialog,
    promptValue,
    setPromptValue,
    closeActionDialog,
    openConfirmDialog,
    openPromptDialog,
  };
};

export const ActionDialog = ({ dialog, promptValue, onPromptValueChange, onClose }) => {
  const titleId = useId();
  const fieldId = useId();
  const inputRef = useRef(null);
  const isDanger = dialog?.variant === 'danger';

  useEffect(() => {
    if (!dialog?.isOpen) {
      return undefined;
    }

    const cancelResult = dialog.mode === 'prompt' ? null : false;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose(cancelResult);
      }
    };
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dialog, onClose]);

  useEffect(() => {
    if (!dialog?.isOpen || dialog.mode !== 'prompt' || !inputRef.current) {
      return;
    }

    inputRef.current.focus();
    const valueLength = inputRef.current.value.length;
    inputRef.current.setSelectionRange?.(valueLength, valueLength);
  }, [dialog]);

  if (!dialog?.isOpen) {
    return null;
  }

  const cancelResult = dialog.mode === 'prompt' ? null : false;
  const confirmResult = dialog.mode === 'prompt' ? promptValue : true;
  const eyebrow = dialog.eyebrow || (isDanger ? 'Attention' : 'Action');

  return (
    <div className="action-dialog-backdrop" role="presentation" onClick={() => onClose(cancelResult)}>
      <div
        className={`action-dialog${isDanger ? ' action-dialog--danger' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="action-dialog-header">
          <div className="action-dialog-copy">
            <span className={`panel-eyebrow action-dialog-eyebrow${isDanger ? ' action-dialog-eyebrow--danger' : ''}`}>{eyebrow}</span>
            <h2 id={titleId}>{dialog.title}</h2>
            {dialog.message ? <p>{dialog.message}</p> : null}
          </div>
          <button
            type="button"
            className="action-dialog-dismiss"
            aria-label="Close dialog"
            onClick={() => onClose(cancelResult)}
          >
            x
          </button>
        </div>

        {dialog.mode === 'prompt' ? (
          <div className="action-dialog-body">
            <label className="form-field action-dialog-field" htmlFor={fieldId}>
              <span>{dialog.promptLabel || 'Note'}</span>
              <textarea
                id={fieldId}
                ref={inputRef}
                value={promptValue}
                onChange={(event) => onPromptValueChange(event.target.value)}
                placeholder={dialog.placeholder}
                rows={4}
              />
            </label>
            {dialog.promptHint ? <p className="action-dialog-hint">{dialog.promptHint}</p> : null}
          </div>
        ) : null}

        <div className="action-dialog-actions">
          <button type="button" className="secondary-button" onClick={() => onClose(cancelResult)}>
            {dialog.cancelLabel}
          </button>
          <button type="button" className={isDanger ? 'danger-button' : 'primary-button'} onClick={() => onClose(confirmResult)}>
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const MetricCard = ({ tone = 'blue', label, value, note }) => (
  <article className={`metric-tile metric-tile--${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {note ? <p>{note}</p> : null}
  </article>
);

export const Panel = ({ eyebrow, title, description, actions, className = '', children }) => (
  <section className={`workspace-panel${className ? ` ${className}` : ''}`}>
    <div className="workspace-panel-header">
      <div>
        {eyebrow ? <span className="panel-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="workspace-panel-actions">{actions}</div> : null}
    </div>
    {children}
  </section>
);

export const StatusPill = ({ status }) => (
  <span className={`status-pill status-pill--${String(status || 'pending').toLowerCase()}`}>{formatStatus(status)}</span>
);

export const EmptyState = ({ title, description }) => (
  <div className="workspace-empty">
    <strong>{title}</strong>
    <p>{description}</p>
  </div>
);

export const KeyValue = ({ label, value }) => (
  <div className="key-value-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export const ActionTile = ({ to, label, description }) => (
  <Link to={to} className="action-tile">
    <strong>{label}</strong>
    <p>{description}</p>
    <span>Open</span>
  </Link>
);

export const VehicleCard = ({ vehicle }) => {
  const status = getVehicleStatus(vehicle);
  const percentage = vehicle?.allocatedQuota
    ? Math.round((Number(vehicle.remainingQuota || 0) / Number(vehicle.allocatedQuota || 1)) * 100)
    : 0;

  return (
    <article className="entity-card">
      <div className="entity-card-header">
        <div>
          <strong>{vehicle.vehicleNumber}</strong>
          <p>{vehicle.vehicleType || 'Vehicle type not set'}</p>
        </div>
        <StatusPill status={status} />
      </div>

      <div className="progress-strip">
        <div className="progress-strip-bar" style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }} />
      </div>

      <div className="entity-card-grid">
        <KeyValue label="Fuel" value={formatStatus(vehicle.fuelType)} />
        <KeyValue label="Remaining" value={formatFuel(vehicle.remainingQuota)} />
        <KeyValue label="Allocated" value={formatFuel(vehicle.allocatedQuota)} />
        <KeyValue label="Used" value={formatFuel(vehicle.usedQuota)} />
      </div>

      {status !== 'approved' ? (
        <div className="entity-card-note">
          {vehicle.approvalNote
            || (status === 'pending'
              ? 'Awaiting admin approval before the QR can be used.'
              : 'This vehicle was rejected. Review the latest admin note.')}
        </div>
      ) : null}

      <Link to={`/vehicle/${vehicle._id}`} className="secondary-button entity-card-link">
        View Record
      </Link>
    </article>
  );
};
