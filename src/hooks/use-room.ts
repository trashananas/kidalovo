'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Message, DrawingObject } from '@/types';

export function useRoom(roomId: string) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isJoinAttemptComplete, setIsJoinAttemptComplete] = useState(false);
  const [joinError, setJoinError] = useState<Error | null>(null);
  const [serverSideMembership, setServerSideMembership] = useState(false);

  // This effect ensures we are officially recognized as a member on the server
  useEffect(() => {
    if (!firestore || !roomId || !user) return;

    const roomRef = doc(firestore, 'rooms', roomId);
    
    // 1. First, attempt to join if not already a member
    updateDoc(roomRef, {
      [`members.${user.uid}`]: 'member',
    }).catch(err => {
      console.warn("Potential failure joining room, but we will wait for snapshot:", err);
    });

    // 2. Listen to the room document to confirm membership from server perspective
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.members && data.members[user.uid]) {
          setServerSideMembership(true);
          setIsJoinAttemptComplete(true);
          setJoinError(null);
        }
      } else {
        setJoinError(new Error("Комната не найдена"));
        setIsJoinAttemptComplete(true);
      }
    }, (err) => {
      setJoinError(err);
      setIsJoinAttemptComplete(true);
    });

    return () => unsubscribe();
  }, [firestore, roomId, user]);


  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !roomId || !serverSideMembership) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId, serverSideMembership]);

  const drawingsQuery = useMemoFirebase(() => {
    if (!firestore || !roomId || !serverSideMembership) return null;
    return query(
      collection(firestore, 'rooms', roomId, 'drawings'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId, serverSideMembership]);

  const { data: rawMessages, isLoading: messagesLoading, error: messagesError } = useCollection<Message>(messagesQuery);
  const { data: drawings, isLoading: drawingsLoading, error: drawingsError } = useCollection<DrawingObject>(drawingsQuery);
  
  // Filter out deleted messages on the client side
  const messages = useMemo(() => {
    return (rawMessages ?? []).filter(m => !m.isDeleted);
  }, [rawMessages]);

  const finalError = joinError || messagesError || drawingsError;
  const finalLoading = !isJoinAttemptComplete || (messagesQuery ? messagesLoading : false) || (drawingsQuery ? drawingsLoading : false);

  return { messages, drawings: drawings ?? [], loading: finalLoading, error: finalError };
}
