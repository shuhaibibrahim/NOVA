const listeners = new Set();
let items = [];
let nextId = 1;
let installed = false;

const ERROR_PATTERN = /unable|fail|error|conflict|already|exceed|invalid|required|missing|cannot|can't|not found|duplicate|select|enter|short/i;

const emit = () => listeners.forEach((listener) => listener(items));

export const notify = (message, type) => {
  const text = String(message ?? '').trim();
  if (!text) return;
  const kind = type || (ERROR_PATTERN.test(text) ? 'error' : 'info');
  const existing = items.find((item) => item.message === text);
  if (existing) {
    items = items.map((item) => (item === existing ? { ...item, count: item.count + 1, at: Date.now() } : item));
  } else {
    items = [{ id: nextId++, message: text, type: kind, count: 1, at: Date.now() }, ...items].slice(0, 100);
  }
  emit();
};

export const dismissNotification = (id) => {
  items = items.filter((item) => item.id !== id);
  emit();
};

export const clearNotifications = () => {
  items = [];
  emit();
};

export const subscribeNotifications = (listener) => {
  listeners.add(listener);
  listener(items);
  return () => listeners.delete(listener);
};

// Routes alerts and uncaught errors into the header notification bell.
export const installNotificationCapture = () => {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.alert = (message) => notify(message);
  window.addEventListener('error', (event) => {
    if (event.message && !/ResizeObserver/i.test(event.message)) notify(`Error: ${event.message}`, 'error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    notify(`Error: ${(reason && reason.message) || reason || 'Unhandled error'}`, 'error');
  });
};
