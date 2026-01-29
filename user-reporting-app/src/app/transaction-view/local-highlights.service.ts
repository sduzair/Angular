import { Injectable } from '@angular/core';

import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { from, Observable } from 'rxjs';

const IDB_NAME = 'amldb';

interface Highlight {
  caseRecordId: string;
  flowOfFundsAmlTransactionId: string;
  highlightColor: string;
}

interface AmlDB extends DBSchema {
  highlightstore: {
    key: [string, string];
    value: Highlight;
    indexes: { 'by-case': string };
  };
}

@Injectable({
  providedIn: 'root',
})
export class LocalHighlightsService {
  private dbPromise: Promise<IDBPDatabase<AmlDB>>;

  constructor() {
    this.dbPromise = openDB<AmlDB>(IDB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('highlightstore')) {
          const store = db.createObjectStore('highlightstore', {
            keyPath: ['caseRecordId', 'flowOfFundsAmlTransactionId'],
          });

          // Add index for efficient caseRecordId queries
          store.createIndex('by-case', 'caseRecordId', { unique: false });
        }
      },
    });
  }

  getHighlights(caseRecordId: string): Observable<Map<string, string>> {
    return from(
      this.dbPromise.then(async (db) => {
        const tx = db.transaction('highlightstore', 'readonly');
        const index = tx.objectStore('highlightstore').index('by-case');

        // Query using index
        const caseHighlights = await index.getAll(caseRecordId);

        return new Map(
          caseHighlights.map((item) => [
            item.flowOfFundsAmlTransactionId,
            item.highlightColor,
          ]),
        );
      }),
    );
  }

  saveHighlights(
    caseRecordId: string,
    highlights: { txnId: string; newColor: string }[],
  ): Observable<void> {
    return from(
      this.dbPromise.then(async (db) => {
        const tx = db.transaction('highlightstore', 'readwrite');
        const store = tx.objectStore('highlightstore');

        await Promise.all(
          highlights.map((h) =>
            store.put({
              caseRecordId,
              flowOfFundsAmlTransactionId: h.txnId,
              highlightColor: h.newColor,
            }),
          ),
        );

        await tx.done;
      }),
    );
  }

  deleteHighlights(caseRecordId: string, txnIds: string[]): Observable<void> {
    return from(
      this.dbPromise.then(async (db) => {
        const tx = db.transaction('highlightstore', 'readwrite');
        const store = tx.objectStore('highlightstore');

        // Delete each highlight using composite key [caseRecordId, txnId]
        await Promise.all(
          txnIds.map((txnId) => store.delete([caseRecordId, txnId])),
        );

        await tx.done;
      }),
    );
  }
}
