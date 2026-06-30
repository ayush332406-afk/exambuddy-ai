import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { mutate } from 'swr';

export function useRealtimeSync() {
  useEffect(() => {
    if (!db) return;

    let fallbackInterval: NodeJS.Timeout;

    // Listen to the central sync document which the backend updates
    const unsubscribe = onSnapshot(
      doc(db, 'app_sync', 'latest'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          console.log('Real-time sync triggered from Firestore', data);
          mutate(
            (key) => typeof key === 'string' && key.startsWith('/api/'),
            undefined,
            { revalidate: true }
          );
          
          mutate(
            (key) => Array.isArray(key) && typeof key[0] === 'string' && key[0].startsWith('/api/'),
            undefined,
            { revalidate: true }
          );
        }
      },
      (error) => {
        console.error('Firestore sync error, falling back to polling:', error);
        // Fallback to polling if Firestore listener fails (e.g. for guests with restricted rules)
        fallbackInterval = setInterval(() => {
          mutate(
            (key) => typeof key === 'string' && key.startsWith('/api/'),
            undefined,
            { revalidate: true }
          );
        }, 5000);
      }
    );

    return () => {
      unsubscribe();
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, []);
}
