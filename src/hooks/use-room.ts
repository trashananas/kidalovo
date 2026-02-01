
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import type { Message, DrawingObject } from '@/types';

const ADMIN_UIDS = ['TTw3ZuEvyXerRBc7jr90PESYdcy1', 'Csr3hpbOWPbbcdP72cOKHp51NOa2'];

export function useRoom(roomId: string, isPasswordVerified: boolean = true) {
  const firestore = useFirestore();
  const { user } = useUser();
  const [isJoinAttemptComplete, setIsJoinAttemptComplete] = useState(false);
  const [joinError, setJoinError] = useState<Error | null>(null);
  const [serverSideMembership, setServerSideMembership] = useState(false);

  const isGlobalAdmin = user && (user.email === 'ananas@kidalovo.internal' || ADMIN_UIDS.includes(user.uid));

  useEffect(() => {
    if (!firestore || !roomId || !user || !isPasswordVerified) return;

    const roomRef = doc(firestore, 'rooms', roomId);
    
    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Админы заходят везде безусловно
        if (isGlobalAdmin) {
          setServerSideMembership(true);
          setIsJoinAttemptComplete(true);
          return;
        }

        if (data.onlyAuthorized && user.isAnonymous) {
          setJoinError(new Error("Эта комната доступна только авторизованным пользователям."));
          setIsJoinAttemptComplete(true);
          return;
        }

        if (data.members && data.members[user.uid]) {
          setServerSideMembership(true);
          setIsJoinAttemptComplete(true);
          setJoinError(null);
        } else {
          updateDoc(roomRef, {
            [`members.${user.uid}`]: {
              role: 'member',
              name: user.displayName || (user.isAnonymous ? 'Аноним' : 'Пользователь')
            },
          }).catch(err => {
            console.warn("Potential failure joining room:", err);
          });
        }
      } else {
        setJoinError(new Error("Комната не найдена"));
        setIsJoinAttemptComplete(true);
      }
    }, (err) => {
      // Если админ - игнорируем ошибки доступа к метаданным комнаты, пробуем грузить контент
      if (isGlobalAdmin) {
        setServerSideMembership(true);
        setIsJoinAttemptComplete(true);
      } else {
        setJoinError(err);
        setIsJoinAttemptComplete(true);
      }
    });

    return () => unsubscribe();
  }, [firestore, roomId, user, isPasswordVerified, isGlobalAdmin]);


  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !roomId || !isPasswordVerified) return null;
    // Админы грузят сразу, остальные ждут подтверждения членства
    if (!isGlobalAdmin && !serverSideMembership) return null;
    
    return query(
      collection(firestore, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId, serverSideMembership, isPasswordVerified, isGlobalAdmin]);

  const drawingsQuery = useMemoFirebase(() => {
    if (!firestore || !roomId || !isPasswordVerified) return null;
    if (!isGlobalAdmin && !serverSideMembership) return null;

    return query(
      collection(firestore, 'rooms', roomId, 'drawings'),
      orderBy('createdAt', 'asc')
    );
  }, [firestore, roomId, serverSideMembership, isPasswordVerified, isGlobalAdmin]);

  const { data: rawMessages, isLoading: messagesLoading, error: messagesError } = useCollection<Message>(messagesQuery);
  const { data: drawings, isLoading: drawingsLoading, error: drawingsError } = useCollection<DrawingObject>(drawingsQuery);
  
  const messages = useMemo(() => {
    return (rawMessages ?? []).filter(m => !m.isDeleted);
  }, [rawMessages]);

  const finalError = joinError || messagesError || drawingsError;
  const finalLoading = (isPasswordVerified && !isJoinAttemptComplete) || (messagesQuery ? messagesLoading : false) || (drawingsQuery ? drawingsLoading : false);

  return { messages, drawings: drawings ?? [], loading: finalLoading, error: finalError };
}
