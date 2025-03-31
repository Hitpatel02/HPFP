/**
 * WhatsApp API Service
 */

import apiRequest, { getAuthHeaders } from './apiUtils';

// WhatsApp API endpoints
const whatsAppAPI = {
  getStatus: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/status', {
        headers: getAuthHeaders(token)
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error getting WhatsApp status:', error);
      return {
        success: false,
        error: error.message || 'Failed to get WhatsApp status'
      };
    }
  },

  startGroupIdRetrieval: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/group-id/start', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error starting WhatsApp group ID retrieval:', error);
      return {
        success: false,
        error: error.message || 'Failed to start WhatsApp group ID retrieval'
      };
    }
  },

  stopGroupIdRetrieval: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/group-id/stop', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error stopping WhatsApp group ID retrieval:', error);
      return {
        success: false,
        error: error.message || 'Failed to stop WhatsApp group ID retrieval'
      };
    }
  },

  sendTestMessage: async (token, groupId) => {
    try {
      const response = await apiRequest('/api/whatsapp/test', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ groupId })
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error sending WhatsApp test message:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp test message'
      };
    }
  },

  forceReconnect: async (token) => {
    try {
      const response = await apiRequest('/api/whatsapp/reconnect', {
        method: 'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({}) // Empty body for POST request
      });
      return { success: true, data: response };
    } catch (error) {
      console.error('Error forcing WhatsApp reconnection:', error);
      return {
        success: false,
        error: error.message || 'Failed to force WhatsApp reconnection'
      };
    }
  }
};

// Helper functions that don't require manual token passing
const getToken = () => localStorage.getItem('token');

export const getWhatsAppStatus = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsAppAPI.getStatus(token);
};

export const startWhatsAppGroupIdRetrieval = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsAppAPI.startGroupIdRetrieval(token);
};

export const stopWhatsAppGroupIdRetrieval = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsAppAPI.stopGroupIdRetrieval(token);
};

export const sendWhatsAppTestMessage = async (groupId) => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsAppAPI.sendTestMessage(token, groupId);
};

export const forceWhatsAppReconnect = async () => {
  const token = getToken();
  if (!token) return { success: false, error: 'Authentication required' };
  return await whatsAppAPI.forceReconnect(token);
};

export default whatsAppAPI; 