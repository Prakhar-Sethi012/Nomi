// Centralized configuration
const BASE_URL = 'http://127.0.0.1:8000';

/**
 * Core Fetch Wrapper
 * Automatically handles JSON headers, error parsing, and URL routing.
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

    // Global Error Interceptor
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Network Failed] ${endpoint}:`, error.message);
    throw error; // Rethrow so the specific component can show a UI error if needed
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