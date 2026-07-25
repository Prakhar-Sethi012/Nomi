import localforage from 'localforage';

// Initialize our custom IndexedDB instance
localforage.config({
  name: 'CommandCenterDB',
  storeName: 'sync_queue', // The table where we store offline actions
  description: 'Stores API requests when the user is offline'
});

export const offlineSync = {
  // 1. ADD TO QUEUE: Saves a failed API request to IndexedDB
  addToQueue: async (url, method, payload = null) => {
    try {
      const currentQueue = await localforage.getItem('offline_actions') || [];
      
      const newAction = {
        id: Date.now(), // Unique ID for the action
        url,
        method,
        payload,
        timestamp: new Date().toISOString()
      };

      currentQueue.push(newAction);
      await localforage.setItem('offline_actions', currentQueue);
      
      console.log(`📡 OFFLINE: Saved ${method} action to IndexedDB Queue.`);
      return true;
    } catch (err) {
      console.error("Failed to save action to IndexedDB", err);
      return false;
    }
  },

  // 2. PROCESS QUEUE: Runs when internet is restored
  processQueue: async () => {
    try {
      const currentQueue = await localforage.getItem('offline_actions') || [];
      
      if (currentQueue.length === 0) {
        console.log("🌐 ONLINE: Sync queue is empty.");
        return;
      }

      console.log(`🌐 ONLINE: Processing ${currentQueue.length} offline actions...`);

      // Keep track of actions that fail so we don't delete them
      const failedActions = [];

      for (const action of currentQueue) {
        try {
          const options = {
            method: action.method,
            headers: { 'Content-Type': 'application/json' },
          };
          if (action.payload) options.body = JSON.stringify(action.payload);

          const response = await fetch(action.url, options);
          
          if (!response.ok) throw new Error(`Backend rejected ${action.method}`);
          console.log(`✅ SYNCED: ${action.method} ${action.url}`);
          
        } catch (err) {
          console.error(`❌ SYNC FAILED: Retaining in queue.`, err);
          failedActions.push(action);
        }
      }

      // Overwrite the queue with only the actions that failed
      await localforage.setItem('offline_actions', failedActions);
      
      if (failedActions.length === 0) {
        console.log("🎉 All offline actions synced successfully!");
        // We trigger a global event so your React components know to re-fetch fresh data
        window.dispatchEvent(new Event('sync-complete'));
      }

    } catch (err) {
      console.error("Error processing sync queue", err);
    }
  }
};