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
      return { message: 'Не удалось создать уникальную комнату. Пожалуйста, попробуйте еще раз.' };
    }

    await addDoc(collection(db, 'rooms'), {
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
    .length(4, 'Код должен состоять из 4 букв')
    .regex(/^[A-Z]+$/, 'Код должен состоять из заглавных латинских букв'),
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
      return { message: 'Комната не найдена. Пожалуйста, проверьте код.' };
    }
  } catch (error) {
    return { message: getErrorMessage(error) };
  }
  redirect(`/${formData.get('code')}`);
}

const messageSchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым').max(280),
  roomId: z.string(),
});

export async function sendMessage(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  try {
    const validatedFields = messageSchema.safeParse({
      message: formData.get('message'),
      roomId: formData.get('roomId'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Неверные данные сообщения.',
      };
    }

    const { message, roomId } = validatedFields.data;

    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('code', '==', roomId), limit(1));
    const roomSnapshot = await getDocs(q);

    if (roomSnapshot.empty) {
      return { message: 'Комната не найдена.' };
    }
    const roomDoc = roomSnapshot.docs[0];

    const messagesColRef = collection(db, 'rooms', roomDoc.id, 'messages');
    await addDoc(messagesColRef, {
      text: message,
      createdAt: serverTimestamp(),
      position: {
        x: Math.random() * 200 + 50,
        y: Math.random() * 200 + 50,
      },
    });

    revalidatePath(`/${roomId}`);
    return { message: 'Сообщение отправлено!' };
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
      throw new Error('Комната не найдена');
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
        throw new Error("Сообщение не найдено");
    }

    await updateDoc(messageDocRef, { position });
    revalidatePath(`/${roomId}`);
  } catch (error) {
    console.error('Не удалось обновить позицию сообщения:', getErrorMessage(error));
  }
}
