import { AppState } from '../types';

const DB_NAME = 'QuantumLogDB';
const STORE_NAME = 'app_state';
const DB_VERSION = 1;

const INITIAL_STATE: AppState = {
  projects: [],
  entries: [],
  todos: [],
  events: []
};

// Open IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    // Check if indexedDB exists
    if (!window.indexedDB) {
      reject("IndexedDB not supported");
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

export const loadState = async (): Promise<AppState | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get('current_state');

      request.onsuccess = () => {
        const result = request.result as AppState;
        resolve(result || INITIAL_STATE);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  } catch (e) {
    console.error("Failed to load state from DB", e);
    // Fallback to localStorage if DB fails (migration path or fallback)
    const local = localStorage.getItem('quantum_log_data_v1');
    return local ? JSON.parse(local) : INITIAL_STATE;
  }
};

export const saveState = async (state: AppState) => {
  try {
    const db = await openDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(state, 'current_state');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to save state to DB", e);
  }
};

// Image helper to convert File to Base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};