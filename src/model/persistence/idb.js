import { DB_NAME, DB_VERSION } from '../../config.js';

// Schema upgrades keyed by the version they upgrade to. Each step runs inside
// the versionchange transaction, in order, from the stored version upwards.
export const migrations = {
  1(db) {
    const players = db.createObjectStore('players', { keyPath: 'id' });
    players.createIndex('nameKey', 'nameKey', { unique: true });
    const games = db.createObjectStore('games', { keyPath: 'id' });
    games.createIndex('finishedAt', 'finishedAt');
    games.createIndex('type', 'type');
    games.createIndex('playerIds', 'config.playerIds', { multiEntry: true });
  },
};

export function openDatabase(factory, { name = DB_NAME, version = DB_VERSION, steps = migrations } = {}) {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, version);
    request.onupgradeneeded = (event) => {
      for (let v = event.oldVersion + 1; v <= event.newVersion; v += 1) {
        steps[v](request.result, request.transaction);
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      // Another tab upgrading the schema must not be blocked by this one.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    request.onerror = () => reject(request.error);
  });
}

export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('Transaction aborted'));
  });
}
