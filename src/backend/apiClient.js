import { NativeModules, Platform } from 'react-native';

import { hasNetworkConnection } from './networkStatus';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
const WEB_API_URL = process.env.EXPO_PUBLIC_WEB_API_URL || API_URL;
const MOBILE_API_URL = process.env.EXPO_PUBLIC_MOBILE_API_URL || '';
const TOKEN_KEY = 'elitebid.sessionToken';
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '0.0.0.0', '::1'];

let memoryToken = null;

export function setSessionToken(token) {
  memoryToken = token || null;

  if (typeof localStorage !== 'undefined') {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getSessionToken() {
  if (memoryToken) {
    return memoryToken;
  }

  if (typeof localStorage !== 'undefined') {
    memoryToken = localStorage.getItem(TOKEN_KEY);
  }

  return memoryToken;
}

export async function apiRequest(path, options = {}) {
  const token = getSessionToken();
  const apiUrl = resolveApiUrl();
  let response;

  if (!hasNetworkConnection()) {
    throw new Error('Sin conexion a internet. Revisa el WiFi o los datos moviles y volve a intentar.');
  }

  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error('No pudimos conectarnos con el servidor de EliteBid. Revisa que la API este levantada en el puerto configurado o que tengas conexion.');
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(publicApiErrorMessage(payload?.message));
  }

  return payload;
}

function publicApiErrorMessage(message) {
  const value = String(message || '');
  const infrastructureError = /max_user_connections|ER_USER_LIMIT_REACHED|mysql|sqlstate|econnrefused|etimedout/i.test(value);

  if (infrastructureError) {
    return 'La sala esta actualizandose. Reintenta en unos segundos.';
  }

  return value || 'No pudimos completar la operacion. Intenta nuevamente.';
}

function resolveApiUrl() {
  if (Platform.OS === 'web') {
    return normalizeApiUrl(WEB_API_URL);
  }

  const configuredUrl = normalizeApiUrl(MOBILE_API_URL || API_URL);
  const configuredHost = getHostFromUrl(configuredUrl);

  if (configuredHost && !isLocalHost(configuredHost)) {
    return configuredUrl;
  }

  const sourceCode = NativeModules.SourceCode;
  const scriptUrl = sourceCode?.scriptURL || sourceCode?.getConstants?.().scriptURL || '';
  const lanHost = getHostFromUrl(scriptUrl);

  if (lanHost && !isLocalHost(lanHost)) {
    return `http://${lanHost}:3001/api`;
  }

  return configuredUrl;
}

function normalizeApiUrl(url) {
  return String(url || '').replace(/\/$/, '');
}

function getHostFromUrl(url) {
  return String(url).match(/^[a-z][a-z0-9+.-]*:\/\/\[?([^/:\\]]+)/i)?.[1];
}

function isLocalHost(host) {
  return LOCAL_HOSTS.includes(String(host).toLowerCase());
}
