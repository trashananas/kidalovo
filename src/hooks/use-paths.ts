'use client';

import { collection, query, orderBy } from 'firebase/firestore';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { Path } from '@/types';

/**
 * Hook to subscribe to all drawing paths in a room in real-time.
 * @param roomId The ID of the room.
 * @returns An object with the array of paths, loading state, and error state.
 */
export function usePaths(roomId: string) {
  const firestore = useFirestore();

  const pathsQuery = useMemoFirebase(() => {
    if (!firestore || !roomId) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'paths'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId]);

  const { data: paths, isLoading, error } = useCollection<Path>(pathsQuery);

  return { paths: paths ?? [], isLoading, error };
}
