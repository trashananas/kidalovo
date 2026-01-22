'use server';

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateRoomCode, getErrorMessage } from './utils';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { classifyMessage } from '@/ai/flows/message-classification';
import type { Message } from '@/types';

type FormState = {
  message: string;
};

export async function createRoom(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  let roomCode: string;
  let roomExists = true;
  let attempts = 0;

  try {
    // Prevent infinite loops
    while (roomExists && attempts < 10) {
      roomCode = generateRoomCode();
      const roomsRef = collection(db, 'rooms');
      const q = query(roomsRef, where('code', '==', roomCode), limit(1));
      const querySnapshot = await getDocs(q);
      roomExists = !querySnapshot.empty;
      attempts++;
    }

    if (roomExists) {
      return { message: 'Could not create a unique room. Please try again.' };
    }

    const newRoomRef = await addDoc(collection(db, 'rooms'), {
      code: roomCode!,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    return { message: getErrorMessage(error) };
  }

  redirect(`/${roomCode!}`);
}

const joinRoomSchema = z.object({
  code: z
    .string()
    .length(4, 'Code must be 4 letters')
    .regex(/^[A-Z]+$/, 'Code must be uppercase letters'),
});

export async function joinRoom(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const validatedFields = joinRoomSchema.safeParse({
      code: formData.get('code'),
    });

    if (!validatedFields.success) {
      return {
        message: validatedFields.error.errors.map((e) => e.message).join(', '),
      };
    }

    const { code } = validatedFields.data;

    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('code', '==', code), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { message: 'Room not found. Please check the code.' };
    }
  } catch (error) {
    return { message: getErrorMessage(error) };
  }
  redirect(`/${formData.get('code')}`);
}

const messageSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(280),
  roomId: z.string(),
  existingMessages: z.string(),
});

export async function sendMessage(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const validatedFields = messageSchema.safeParse({
      message: formData.get('message'),
      roomId: formData.get('roomId'),
      existingMessages: formData.get('existingMessages'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Invalid message data.',
      };
    }

    const { message, roomId, existingMessages } = validatedFields.data;

    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('code', '==', roomId), limit(1));
    const roomSnapshot = await getDocs(q);

    if (roomSnapshot.empty) {
      return { message: 'Room not found.' };
    }
    const roomDoc = roomSnapshot.docs[0];
    
    const parsedMessages = JSON.parse(existingMessages);

    const classificationResult = await classifyMessage({
      newMessage: message,
      existingMessages: parsedMessages,
    });

    const messagesColRef = collection(db, 'rooms', roomDoc.id, 'messages');
    await addDoc(messagesColRef, {
      text: message,
      createdAt: serverTimestamp(),
      position: {
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50,
      },
      classification: classificationResult.classification,
      reason: classificationResult.reason,
    });

    revalidatePath(`/${roomId}`);
    return { message: 'Message sent!' };
  } catch (error) {
    return { message: getErrorMessage(error) };
  }
}

export async function updateMessagePosition(
  roomId: string,
  messageId: string,
  position: { x: number; y: number }
) {
  try {
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('code', '==', roomId), limit(1));
    const roomSnapshot = await getDocs(q);

    if (roomSnapshot.empty) {
      throw new Error('Room not found');
    }

    const roomDocId = roomSnapshot.docs[0].id;
    const messageDocRef = doc(
      db,
      'rooms',
      roomDocId,
      'messages',
      messageId
    );
    
    const messageDoc = await getDoc(messageDocRef);
    if (!messageDoc.exists()) {
        throw new Error("Message not found");
    }

    await updateDoc(messageDocRef, { position });
    revalidatePath(`/${roomId}`);
  } catch (error) {
    console.error('Failed to update message position:', getErrorMessage(error));
  }
}
