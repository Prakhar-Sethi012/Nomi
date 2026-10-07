import { cacheResponse, getCachedResponse, clearApiCache } from './db';
import { offlineSync } from './offlineSync';

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Core fetch wrapper with "Cache then Network / Offline-First" fallback
 */
const fetchAPI = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET';

  // 1. Grab auth token
  const token = localStorage.getItem('token');
  
  // 2. Attach headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid: teardown session and clear sensitive cached data
        localStorage.removeItem('token');
        await clearApiCache();
        window.location.reload(); 
      }
      
      // On server 5xx errors during GET, check if IndexedDB has a valid cached copy
      if (isGet && response.status >= 500) {
        const cachedData = await getCachedResponse(endpoint);
        if (cachedData !== null) {
          console.warn(`⚠️ [IndexedDB Cache Fallback] Server returned ${response.status}. Serving cached data for ${endpoint}`);
          return cachedData;
        }
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API request failed with status ${response.status}`);
    }

    const data = await response.json();

    // 3. Save successful GET response directly to IndexedDB for offline access
    if (isGet) {
      await cacheResponse(endpoint, data);
    }

    return data;
  } catch (error) {
    // 4. OFFLINE FALLBACK: If network failed on a GET request, serve cached data from IndexedDB
    if (isGet) {
      const cachedData = await getCachedResponse(endpoint);
      if (cachedData !== null) {
        console.log(`📡 [IndexedDB Offline] Network unavailable. Serving cached data for ${endpoint}`);
        return cachedData;
      }
    } else {
      // If a mutation failed due to network disconnect, queue it for background sync
      const isNetworkError = !navigator.onLine || error.name === 'TypeError' || error.message.includes('fetch');
      if (isNetworkError) {
        let payload = null;
        if (options.body) {
          try {
            payload = JSON.parse(options.body);
          } catch {
            payload = options.body;
          }
        }
        await offlineSync.addToQueue(`${API_URL}${endpoint}`, method, payload);
      }
    }

    throw error;
  }
};

export const api = {
  // 🔥 Authentication Endpoints
  login: (data) => fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Profile
  getProfile: () => fetchAPI('/profile/'),
  updateProfile: (data) => fetchAPI('/profile', { method: 'PUT', body: JSON.stringify(data) }),

  // Tasks
  getTasks: (start_date, end_date) => {
    let url = '/tasks/';
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    if (params.toString()) url += `?${params.toString()}`;
    return fetchAPI(url);
  },
  getTodoList: () => fetchAPI('/tasks/todo'),
  addTask: (data) => fetchAPI('/tasks/', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id, data) => fetchAPI(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id) => fetchAPI(`/tasks/${id}`, { method: 'DELETE' }),

  // Subjects & Attendance
  getSubjects: () => fetchAPI('/subjects/'),
  addSubject: (data) => fetchAPI('/subjects/', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id, data) => fetchAPI(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  markAttendance: (id, attended, component = 'theory') => fetchAPI(`/subjects/${id}/attendance?attended=${attended}&component=${component}`, { method: 'PUT' }),
  deleteSubject: (id) => fetchAPI(`/subjects/${id}`, { method: 'DELETE' }),

  // Expenses
  getExpenses: () => fetchAPI('/expenses/'),
  addExpense: (data) => fetchAPI('/expenses/', { method: 'POST', body: JSON.stringify(data) }),
  updateExpense: (id, data) => fetchAPI(`/expenses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteExpense: (id) => fetchAPI(`/expenses/${id}`, { method: 'DELETE' }),

  // Portfolio
  getPortfolio: () => fetchAPI('/portfolio/'),
  updatePortfolioItem: (id, data) => fetchAPI(`/portfolio/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  addPortfolioItem: (data) => fetchAPI('/portfolio/', { method: 'POST', body: JSON.stringify(data) }),
  deletePortfolioItem: (id) => fetchAPI(`/portfolio/${id}`, { method: 'DELETE' }),

  // Social & Privacy
  createCircle: (data) => fetchAPI('/social/circles', { method: 'POST', body: JSON.stringify(data) }),
  joinCircle: (data) => fetchAPI('/social/circles/join', { method: 'POST', body: JSON.stringify(data) }),
  getMyCircles: () => fetchAPI('/social/circles/my-circles'),
  getCircleRoster: (circleId) => fetchAPI(`/social/circles/${circleId}/roster`),
  getFriendTimetable: (userId) => fetchAPI(`/social/member/${userId}/timetable`),
  setNickname: (friendId, nickname) => fetchAPI(`/social/member/${friendId}/nickname`, { method: 'PUT', body: JSON.stringify({ nickname }) }),

  // Notes / Scratchpad
  getNotes: () => fetchAPI('/notes/'),
  addNote: (data) => fetchAPI('/notes/', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => fetchAPI(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => fetchAPI(`/notes/${id}`, { method: 'DELETE' }),

  // Social Expansions
  searchCircles: (query) => fetchAPI(`/social/circles/search?q=${query}`),
  leaveCircle: (circleId) => fetchAPI(`/social/circles/${circleId}/leave`, { method: 'DELETE' }),
  deleteCircle: (circleId) => fetchAPI(`/social/circles/${circleId}`, { method: 'DELETE' }),
  cloneFriend: (userId) => fetchAPI(`/social/member/${userId}/clone`, { method: 'POST' }),
  getCloseFriends: () => fetchAPI('/social/close-friends'),
  deleteCloseFriend: (npcId) => fetchAPI(`/social/close-friends/${npcId}`, { method: 'DELETE' }),
  getCircleHistory: (circleId) => fetchAPI(`/social/circles/${circleId}/history`),

  // Phase 2: Meetup Room
  sendMeetup: (data) => fetchAPI('/social/meetups', { method: 'POST', body: JSON.stringify(data) }),
  getIncomingMeetups: () => fetchAPI('/social/meetups/incoming'),
  getOutgoingMeetups: () => fetchAPI('/social/meetups/outgoing'),
  updateMeetupStatus: (id, status) => fetchAPI(`/social/meetups/${id}/status?status=${status}`, { method: 'PUT' }),

  // Security & Account
  resetPin: (data) => fetchAPI('/auth/reset-pin', { method: 'POST', body: JSON.stringify(data) }),
  selfDestruct: () => fetchAPI('/profile/self-destruct', { method: 'DELETE' }),
  verifyPin: (app_pin) => fetchAPI('/auth/verify-pin', { method: 'POST', body: JSON.stringify({ app_pin }) }),

  // System
  getAnnouncement: () => fetchAPI('/system/announcement'),
};