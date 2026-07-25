import { offlineSync } from './offlineSync';

// Centralized configuration
const BASE_URL = 'http://127.0.0.1:8000';

/**
 * Core Fetch Wrapper
 * Automatically handles JSON headers, error parsing, URL routing, AND Offline Syncing.
 */
async function fetchAPI(endpoint, options = {}) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    // Global Error Interceptor for valid backend rejections (like a 400 Bad Request)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    const method = (options.method || 'GET').toUpperCase();
    
    // 🔥 THE OFFLINE INTERCEPTOR
    // If it's a mutative request (changing data) and the network failed...
    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const isNetworkError = !navigator.onLine || error.name === 'TypeError' || error.message.includes('fetch');
      
      if (isNetworkError) {
        console.warn(`[Offline Intercept] Network down. Queuing ${method} to ${endpoint}`);
        
        // Parse the body back into a JS object so we can save it to IndexedDB
        const payload = options.body ? JSON.parse(options.body) : null;
        
        // Save the action to our local database queue
        await offlineSync.addToQueue(`${BASE_URL}${endpoint}`, method, payload);
        
        // Return a mock successful response so the UI optimistically updates!
        return { 
          _offline: true, 
          message: "Saved to offline queue",
          ...(payload || {}) 
        };
      }
    }

    // If it's a GET request, or a legitimate backend error, throw normally
    console.error(`[Network Failed] ${endpoint}:`, error.message);
    throw error; 
  }
}

/**
 * The Command Center API SDK
 * Your React components will import and call these functions instead of raw fetch().
 */
export const api = {
  // Profile
  getProfile: () => fetchAPI('/profile/'),
  setupProfile: (data) => fetchAPI('/profile/setup', { method: 'POST', body: JSON.stringify(data) }),
  updateProfile: (data) => fetchAPI('/profile/', { method: 'PUT', body: JSON.stringify(data) }),

  // Subjects & Attendance
  getSubjects: () => fetchAPI('/subjects/'),
  addSubject: (data) => fetchAPI('/subjects/', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id, data) => fetchAPI(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSubject: (id) => fetchAPI(`/subjects/${id}`, { method: 'DELETE' }),
  markAttendance: (id, attended) => fetchAPI(`/subjects/${id}/attendance?attended=${attended}`, { method: 'PUT' }),

  // Tasks
  getTodoTasks: () => fetchAPI('/tasks/todo'),
  updateTask: (id, data) => fetchAPI(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addTask: (data) => fetchAPI('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  deleteTask: (id) => fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: () => fetchAPI('/expenses/'),
  updateExpense: (id, data) => fetchAPI(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addExpense: (data) => fetchAPI('/expenses/', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),

  // Portfolio
  getPortfolio: () => fetchAPI('/portfolio/'),
  updatePortfolioItem: (id, data) => fetchAPI(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addPortfolioItem: (data) => fetchAPI('/portfolio/', { method: 'POST', body: JSON.stringify(data) }),
  deletePortfolioItem: (id) => fetchAPI(`/portfolio/${id}`, { method: 'DELETE' })
};