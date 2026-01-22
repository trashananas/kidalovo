'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Message } from '@/types';

export function useRoom(roomId: string) {
  const firestore = useFirestore();
  const { user } = useUser();

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !roomId) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId]);

  const { data: messages, isLoading, error } = useCollection<Message>(messagesQuery);
  
  // Add user to room members when they join
  useEffect(() => {
    if (firestore && roomId && user) {
      const roomRef = doc(firestore, 'rooms', roomId);
      updateDoc(roomRef, {
        [`members.${user.uid}`]: 'member',
      }).catch((err) => {
        // We can ignore permission errors here if the user is already a member.
        // A more robust solution might check if the user is already a member first.
        if (err.code !== 'permission-denied') {
          console.error("Failed to add user to room members:", err);
        }
      });
    }
  }, [firestore, roomId, user]);

  return { messages: messages ?? [], loading: isLoading, error };
}
