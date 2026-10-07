import localforage from 'localforage';

// 1. Data Cache Store (for caching GET requests: tasks, subjects, profile, notes, expenses, etc.)
export const dataCache = localforage.createInstance({
  name: 'NomiDB',
  storeName: 'api_cache',
  description: 'Offline API response cache for Nomi Student OS'
});

// 2. User Storage (for async storage of client-side assets like doodles and directory links)
export const userStorage = localforage.createInstance({
  name: 'NomiDB',
  storeName: 'user_storage',
  description: 'Asynchronous storage for user assets, links, and doodles'
});

// 3. Sync Queue Store (for queued offline mutations)
export const syncQueue = localforage.createInstance({
  name: 'NomiDB',
  storeName: 'sync_queue',
  description: 'Offline mutation request queue'
});

/**
 * Cache an API response in IndexedDB
 * @param {string} key - The endpoint/cache key
 * @param {any} data - JSON response data to cache
 */
export const cacheResponse = async (key, data) => {
  try {
    await dataCache.setItem(key, {
      data,
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn(`[IndexedDB] Failed to cache data for ${key}:`, err);
  }
};

/**
 * Retrieve cached API response from IndexedDB
 * @param {string} key - The endpoint/cache key
 * @returns {Promise<any|null>} Cached data or null
 */
export const getCachedResponse = async (key) => {
  try {
    const entry = await dataCache.getItem(key);
    if (!entry) return null;
    return entry.data !== undefined ? entry.data : entry;
  } catch (err) {
    console.warn(`[IndexedDB] Failed to retrieve cached data for ${key}:`, err);
    return null;
  }
};

/**
 * Remove specific cache key or invalidate cache
 * @param {string} key
 */
export const invalidateCache = async (key) => {
  try {
    await dataCache.removeItem(key);
  } catch (err) {
    console.warn(`[IndexedDB] Failed to invalidate cache for ${key}:`, err);
  }
};

/**
 * Clear the entire API cache (e.g. on logout)
 */
export const clearApiCache = async () => {
  try {
    await dataCache.clear();
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear API cache:', err);
  }
};

