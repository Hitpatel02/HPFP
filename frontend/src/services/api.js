/**
 * API Service to centralize all API calls with consistent error handling
 */

import axios from 'axios';

// Import necessary store for auth actions - we'll add dynamic imports to avoid circular imports
let store;
let logoutAction;

// Initialize store and actions dynamically
const initializeAuthStore = async () => {
  if (!store) {
    const storeModule = await import('../redux/store');
    const authSliceModule = await import('../redux/authSlice');
    store = storeModule.store;
    logoutAction = authSliceModule.logout;
  }
};

// Flag to prevent multiple redirects
let isRedirecting = false;

// Base URL from environment variable
const BASE_URL = '';

// Helper to add cache prevention
const addCacheBuster = (url) => {
  const timestamp = new Date().getTime();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${timestamp}`;
};

// Helper to get authorization headers
const getAuthHeaders = (token) => {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store'
  };
};

// Helper to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  
  try {
    // Extract payload from token
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token has expiration
    if (!payload.exp) return false;
    
    // Compare expiration with current time
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// API request helper with error handling
const apiRequest = async (endpoint, options = {}) => {
  try {
    // Initialize auth store on first use
    await initializeAuthStore();
    
    const url = addCacheBuster(`${BASE_URL}${endpoint}`);
    
    // Check if token is required for this endpoint
    const isAuthEndpoint = !endpoint.includes('/login');
    
    if (isAuthEndpoint) {
      // Get current token from localStorage
      const token = localStorage.getItem('token');
      
      // Check if token is expired
      if (isTokenExpired(token)) {
        console.warn('Token is expired, logging out user');
        if (store && logoutAction) {
          store.dispatch(logoutAction());
        }
        
        if (!isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            isRedirecting = false;
            window.location.href = '/login';
          }, 100);
        }
        
        throw new Error('Session expired. Please login again.');
      }
      
      // Add token to request headers
      if (token && !options.headers?.Authorization) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
    }
    
    // Handle request body properly
    if (options.body) {
      let processedBody;
      
      // If body is already a string, try to parse it to ensure it's valid JSON
      if (typeof options.body === 'string') {
        try {
          // Parse string to object to prevent double stringification
          processedBody = JSON.parse(options.body);
        } catch (error) {
          console.warn('Failed to parse request body string, using as object:', error);
          // If parsing fails, it may not be JSON, so use as is
          processedBody = options.body;
        }
      } else {
        // If body is already an object, use it directly
        processedBody = options.body;
      }
      
      // Clean the object to ensure only valid values are sent
      processedBody = JSON.parse(JSON.stringify(processedBody));
      
      // Now stringify the clean object
      options.body = JSON.stringify(processedBody);
    }
    
    console.log(`API Request: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    // Handle non-2xx responses
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401 || response.status === 403) {
        console.warn(`Authentication error: ${response.status}`);
        
        // Dispatch logout action
        if (store && logoutAction) {
          store.dispatch(logoutAction());
        }
        
        // Redirect to login page
        if (!isRedirecting) {
          isRedirecting = true;
          setTimeout(() => {
            isRedirecting = false;
            window.location.href = '/login';
          }, 100);
        }
      }
      
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        // Try to parse error as JSON
        const errorData = await response.json();
        throw new Error(errorData.error || 'An error occurred');
      } else {
        // Fallback to status text
        throw new Error(response.statusText || 'An error occurred');
      }
    }

    // For empty responses (like 204 No Content)
    if (response.status === 204) {
      return null;
    }
    
    // Parse JSON response
    return response.json();
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    return apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
  },
  
  verifyAuth: async (token) => {
    return apiRequest('/api/auth/verify', {
      headers: getAuthHeaders(token)
    });
  },
  
  getUsers: async (token) => {
    return apiRequest('/api/auth/users', {
      headers: getAuthHeaders(token)
    });
  },
  
  createUser: async (token, userData) => {
    return apiRequest('/api/auth/users', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData)
    });
  },
  
  updateUser: async (token, userId, userData) => {
    return apiRequest(`/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: getAuthHeaders(token),
      body: JSON.stringify(userData)
    });
  },
  
  deleteUser: async (token, userId) => {
    return apiRequest(`/api/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  }
};

// Clients API
export const clientsAPI = {
  getAll: async (token) => {
    return apiRequest('/api/clients', {
      headers: getAuthHeaders(token)
    });
  },
  
  getById: async (token, id) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      headers: getAuthHeaders(token)
    });
  },
  
  create: async (token, clientData) => {
    return apiRequest('/api/clients', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(clientData)
    });
  },
  
  update: async (token, id, clientData) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(clientData)
    });
  },
  
  delete: async (token, id) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/clients/${numericId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  }
};

// Documents API
export const documentsAPI = {
  getPending: async (token) => {
    return apiRequest('/api/pending-documents', {
      headers: getAuthHeaders(token)
    });
  },
  
  getByClient: async (token, clientId) => {
    // Ensure clientId is treated as a number if it's a numeric string
    const numericId = !isNaN(clientId) ? Number(clientId) : clientId;
    return apiRequest(`/api/clients/${numericId}/documents`, {
      headers: getAuthHeaders(token)
    });
  },
  
  updateStatus: async (token, documentId, status) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ status })
    });
  },
  
  create: async (token, clientId, documentData) => {
    // Ensure clientId is treated as a number if it's a numeric string
    const numericId = !isNaN(clientId) ? Number(clientId) : clientId;
    
    // Create a clean copy of documentData to avoid modifying the original
    const cleanData = { ...documentData };
    
    // Add clientId to document data
    cleanData.client_id = numericId;
    
    return apiRequest(`/api/documents`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(cleanData)
    });
  },
  
  update: async (token, documentId, updates) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(updates)
    });
  },
  
  delete: async (token, documentId) => {
    // Ensure documentId is treated as a number if it's a numeric string
    const numericId = !isNaN(documentId) ? Number(documentId) : documentId;
    return apiRequest(`/api/documents/${numericId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(token)
    });
  },
  
  createForAll: async (token) => {
    return apiRequest('/api/documents/create-for-all', {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
  },
  
  createForClient: async (token, clientId) => {
    // Ensure clientId is treated as a number if it's a numeric string
    const numericId = !isNaN(clientId) ? Number(clientId) : clientId;
    return apiRequest(`/api/documents/create-for-client/${numericId}`, {
      method: 'POST',
      headers: getAuthHeaders(token)
    });
  },
  
  cleanupDuplicates: async (token, month = null) => {
    return apiRequest('/api/documents/cleanup-duplicates', {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ month })
    });
  }
};

// Settings API
export const settingsAPI = {
  getReminders: async (token) => {
    return apiRequest('/api/reminders', {
      headers: getAuthHeaders(token)
    });
  },
  
  updateReminders: async (token, settings) => {
    return apiRequest('/api/reminders', {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  updateSettings: async (token, id, settings) => {
    // Ensure id is treated as a number if it's a numeric string
    const numericId = !isNaN(id) ? Number(id) : id;
    return apiRequest(`/api/settings/${numericId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(token),
      body: JSON.stringify(settings)
    });
  },
  
  getSettings: async (token) => {
    return apiRequest('/api/settings', {
      headers: getAuthHeaders(token)
    });
  }
};

// Reports API
export const reportsAPI = {
  generateReport: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/generate${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest(url, {
      headers: getAuthHeaders(token)
    });
  },
  
  getReportData: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/data${params.toString() ? `?${params.toString()}` : ''}`;
    
    return apiRequest(url, {
      headers: getAuthHeaders(token)
    });
  },
  
  downloadReport: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/download${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Special handling for download - use fetch directly
    const response = await fetch(url, {
      headers: getAuthHeaders(token)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    
    return response.blob();
  },
  
  downloadReportCSV: async (token, startDate, endDate) => {
    // Build query parameters for date filtering
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const url = `/api/reports/download-csv${params.toString() ? `?${params.toString()}` : ''}`;
    
    // Special handling for CSV download - use axios for consistent text response
    try {
      const response = await axios.get(`${BASE_URL}${url}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/csv' 
        },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading report as CSV:', error);
      throw new Error(error.response?.data?.error || error.message || 'Failed to download CSV report');
    }
  }
};

// WhatsApp API endpoints
export const whatsAppAPI = {
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

// Export wrapper functions for the individual endpoints
export const startWhatsAppGroupIdRetrieval = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    return await whatsAppAPI.startGroupIdRetrieval(token);
  } catch (error) {
    console.error('Error in startWhatsAppGroupIdRetrieval:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

export const stopWhatsAppGroupIdRetrieval = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    return await whatsAppAPI.stopGroupIdRetrieval(token);
  } catch (error) {
    console.error('Error in stopWhatsAppGroupIdRetrieval:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

export const getWhatsAppStatus = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    return await whatsAppAPI.getStatus(token);
  } catch (error) {
    console.error('Error in getWhatsAppStatus:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

export const sendWhatsAppTestMessage = async (groupId) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    if (!groupId) {
      return {
        success: false,
        error: 'Group ID is required'
      };
    }
    
    return await whatsAppAPI.sendTestMessage(token, groupId);
  } catch (error) {
    console.error('Error in sendWhatsAppTestMessage:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

export const forceWhatsAppReconnect = async () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return {
        success: false,
        error: 'Authentication required'
      };
    }
    
    return await whatsAppAPI.forceReconnect(token);
  } catch (error) {
    console.error('Error in forceWhatsAppReconnect:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
};

// Add logs API functions to the service object
const logs = {
  // Get WhatsApp logs with date range
  getWhatsappLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/logs/whatsapp`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting WhatsApp logs:', error);
      return null;
    }
  },
  
  // Get email logs with date range
  getEmailLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/logs/email`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting email logs:', error);
      return null;
    }
  },
  
  // Download WhatsApp logs as CSV
  downloadWhatsappLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/logs/whatsapp/download`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading WhatsApp logs:', error);
      return null;
    }
  },
  
  // Download email logs as CSV
  downloadEmailLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.get(`${BASE_URL}/api/logs/email/download`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate },
        responseType: 'text'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading email logs:', error);
      return null;
    }
  },
  
  // Clear WhatsApp logs for date range
  clearWhatsappLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/logs/whatsapp`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error clearing WhatsApp logs:', error);
      return null;
    }
  },
  
  // Clear email logs for date range
  clearEmailLogs: async (token, startDate, endDate) => {
    try {
      const response = await axios.delete(`${BASE_URL}/api/logs/email`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error clearing email logs:', error);
      return null;
    }
  }
};

// Create a unified API object for export
const api = {
  auth: authAPI,
  clients: clientsAPI,
  documents: documentsAPI,
  settings: settingsAPI,
  reports: reportsAPI,
  whatsApp: whatsAppAPI,
  logs: logs
};

export default api; 