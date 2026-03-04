const toList = (value) =>
  value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);

export const appConfig = {
  supportAddress: import.meta.env.VITE_SUPPORT_ADDRESS || '',
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE || '',
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || '',
  branches: toList(import.meta.env.VITE_BRANCHES || ''),
};
