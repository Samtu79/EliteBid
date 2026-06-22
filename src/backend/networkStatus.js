import NetInfo from '@react-native-community/netinfo';

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
  return subscribeConnectionStatus(({ online }) => callback(online));
}

export function subscribeConnectionStatus(callback) {
  return NetInfo.addEventListener((state) => {
    const online = state.isConnected !== false && state.isInternetReachable !== false;
    const type = state.type === 'wifi' || state.type === 'cellular' ? state.type : 'unknown';

    callback({ online, type });
  });
}
