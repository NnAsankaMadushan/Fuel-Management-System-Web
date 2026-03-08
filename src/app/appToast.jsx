import { useToast } from '@chakra-ui/react';
import { useCallback, useEffect, useRef } from 'react';

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M5 12.5 9.2 17 19 7.5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 8.25h.01M11 11h1v5h1M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const WarningIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 9v4m0 4h.01M10.3 4.86 2.9 17.14A1.5 1.5 0 0 0 4.18 19.4h15.64a1.5 1.5 0 0 0 1.28-2.26L13.7 4.86a1.5 1.5 0 0 0-2.56 0Z"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  </svg>
);

const BellIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
    <path
      d="M9.5 17a2.5 2.5 0 0 0 5 0"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const iconByStatus = {
  success: CheckIcon,
  error: WarningIcon,
  warning: WarningIcon,
  notification: BellIcon,
  info: InfoIcon,
};

const titleByStatus = {
  success: 'Success',
  error: 'Action failed',
  warning: 'Attention',
  notification: 'Notification',
  info: 'Update',
};

const buildToastId = (prefix, status, title, description) =>
  `${prefix}-${status}-${title || 'toast'}-${description || ''}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const AppToastCard = ({
  status = 'info',
  title,
  description,
  onClose,
}) => {
  const Icon = iconByStatus[status] || InfoIcon;

  return (
    <div className={`app-toast app-toast--${status}`} role="status" aria-live="polite">
      <span className="app-toast-icon" aria-hidden="true">
        <Icon />
      </span>
      <div className="app-toast-copy">
        <strong>{title || titleByStatus[status] || titleByStatus.info}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <button
        type="button"
        className="app-toast-close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        x
      </button>
    </div>
  );
};

export const useAppToast = () => {
  const toast = useToast();

  return useCallback(
    ({
      id,
      title,
      description,
      status = 'info',
      duration = 5000,
      position = 'top-right',
    }) => {
      toast({
        id: id || `app-toast-${status}-${Date.now()}`,
        duration,
        position,
        containerStyle: {
          width: '100%',
          maxWidth: 'min(680px, calc(100vw - 16px))',
        },
        render: ({ onClose }) => (
          <AppToastCard
            status={status}
            title={title}
            description={description}
            onClose={onClose}
          />
        ),
      });
    },
    [toast],
  );
};

export const useToastAlert = (
  message,
  {
    status = 'info',
    title,
    duration = 5000,
    position = 'top-right',
    skip = false,
    idPrefix = 'app-alert',
  } = {},
) => {
  const showToast = useAppToast();
  const lastShownRef = useRef('');

  useEffect(() => {
    const normalizedMessage = typeof message === 'string' ? message.trim() : '';

    if (skip || !normalizedMessage) {
      lastShownRef.current = '';
      return;
    }

    const nextKey = `${status}:${title || ''}:${normalizedMessage}`;

    if (lastShownRef.current === nextKey) {
      return;
    }

    lastShownRef.current = nextKey;

    showToast({
      id: buildToastId(idPrefix, status, title, normalizedMessage),
      title,
      description: normalizedMessage,
      status,
      duration,
      position,
    });
  }, [duration, idPrefix, message, position, showToast, skip, status, title]);
};
