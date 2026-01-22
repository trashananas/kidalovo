'use server';

import {
  collection,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
} from 'firebase/firestore';
import { generateRoomCode, getErrorMessage } from './utils';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getFirestore } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';


type FormState = {
  message: string;
};

// Helper function to get the Firestore instance
function getDb() {
  return getFirestore(initializeFirebase().firebaseApp);
}

export async function createRoom(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  let attempts = 0;
  const maxAttempts = 10;
  const db = getDb();

  while (attempts < maxAttempts) {
    attempts++;
    const roomCode = generateRoomCode();
    const roomRef = doc(db, 'rooms', roomCode);

    try {
      const docSnap = await getDoc(roomRef);

      if (docSnap.exists()) {
        console.log(`Код комнаты ${roomCode} уже существует. Повторная попытка...`);
        continue;
      }
      
      await setDoc(roomRef, {
        code: roomCode,
        createdAt: serverTimestamp(),
        members: {}, // Add members map
      });
      
      redirect(`/${roomCode}`);

    } catch (error) {
      const errorMessage = getErrorMessage(error);
      console.error(`Ошибка при создании комнаты: ${errorMessage}`);
      // Only return a user-facing error on the last attempt
      if (attempts === maxAttempts) {
        return { message: `Не удалось создать комнату: ${errorMessage}` };
      }
    }
  }

  return { message: 'Не удалось создать уникальную комнату после 10 попыток. Пожалуйста, попробуйте еще раз.' };
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
  const db = getDb();
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
    const roomRef = doc(db, 'rooms', code);
    const roomSnap = await getDoc(roomRef);

    if (!roomSnap.exists()) {
      return { message: 'Комната не найдена. Пожалуйста, проверьте код.' };
    }
  } catch (error) {
    return { message: getErrorMessage(error) };
  }
  redirect(`/${formData.get('code') as string}`);
}

const messageSchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым').max(280),
  roomId: z.string(),
  userId: z.string(),
});

export async function sendMessage(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const db = getDb();
  try {
    const validatedFields = messageSchema.safeParse({
      message: formData.get('message'),
      roomId: formData.get('roomId'),
      userId: formData.get('userId'),
    });

    if (!validatedFields.success) {
      return {
        message: 'Неверные данные сообщения.',
      };
    }

    const { message, roomId, userId } = validatedFields.data;

    const roomDocRef = doc(db, 'rooms', roomId);
    const messagesColRef = collection(roomDocRef, 'messages');
    
    await addDoc(messagesColRef, {
      text: message,
      userId: userId,
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
  const db = getDb();
  try {
    const messageDocRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await updateDoc(messageDocRef, { position });
    revalidatePath(`/${roomId}`);
  } catch (error) {
    console.error('Не удалось обновить позицию сообщения:', getErrorMessage(error));
  }
}
