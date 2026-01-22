'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Message } from '@/types';

export function useRoom(roomId: string) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isJoinAttemptComplete, setIsJoinAttemptComplete] = useState(false);
  const [joinError, setJoinError] = useState<Error | null>(null);

  // This effect will run once to add the user to the room.
  useEffect(() => {
    // Reset state if user/room changes
    setIsJoinAttemptComplete(false);
    setJoinError(null);

    if (firestore && roomId && user) {
      const roomRef = doc(firestore, 'rooms', roomId);
      // Attempt to add the user to the members list.
      // The security rules are set up to allow this specific update for any signed-in user.
      updateDoc(roomRef, {
        [`members.${user.uid}`]: 'member',
      })
      .then(() => {
        // Once the update is successful, we know the user is a member.
        setIsJoinAttemptComplete(true);
      })
      .catch((err) => {
        // If this update fails with a permission error, it's likely because the underlying
        // 'get' in the security rule failed, which usually means the room document doesn't exist.
        console.error("Failed to add user to room members:", err);
        setJoinError(err);
        setIsJoinAttemptComplete(true); // The attempt is complete, even if it failed.
      });
    } else if (!user || !firestore) {
        // If there's no user or firestore isn't ready, the attempt is (vacuously) complete.
        // This allows loading states to resolve correctly.
        setIsJoinAttemptComplete(true);
    }
  }, [firestore, roomId, user]);


  const messagesQuery = useMemoFirebase(() => {
    // Only construct the query if the join attempt is complete and was successful.
    if (!firestore || !roomId || !isJoinAttemptComplete || joinError) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId, isJoinAttemptComplete, joinError]);

  const { data: messages, isLoading: messagesLoading, error: messagesError } = useCollection<Message>(messagesQuery);
  
  const finalError = joinError || messagesError;

  // The overall loading state is true until the join is complete AND message loading is complete (if applicable).
  const finalLoading = !isJoinAttemptComplete || (messagesQuery ? messagesLoading : false);

  return { messages: messages ?? [], loading: finalLoading, error: finalError };
}
