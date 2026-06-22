import { apiRequest } from './apiClient';

export async function getNotifications() {
  return apiRequest('/notificaciones');
}

export async function performNotificationAction(notificationId) {
  return apiRequest(`/notificaciones/${notificationId}/accion`, {
    method: 'POST'
  });
}

export async function markAllNotificationsRead() {
  return apiRequest('/notificaciones/leer-todas', {
    method: 'PATCH'
  });
}
