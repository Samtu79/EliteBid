const listeners = new Set();

export function getInitialNetworkStatus() {
  if (typeof navigator === 'undefined' || typeof navigator.onLine !== 'boolean') {
    return true;
  }

  return navigator.onLine;
}

export function hasNetworkConnection() {
  return getInitialNetworkStatus();
}

export function subscribeNetworkStatus(callback) {
  if (typeof window === 'undefined' || !window.addEventListener) {
    return () => {};
  }

  const notify = () => {
    const online = getInitialNetworkStatus();
    listeners.forEach((listener) => listener(online));
  };
  listeners.add(callback);
  window.addEventListener('online', notify);
  window.addEventListener('offline', notify);

  return () => {
    listeners.delete(callback);
    window.removeEventListener('online', notify);
    window.removeEventListener('offline', notify);
  };
}
