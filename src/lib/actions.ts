'use server';

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  setDoc,
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
  let attempts = 0;
  const maxAttempts = 10;

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

      // Код комнаты уникален, создаем новую комнату.
      await setDoc(roomRef, {
        code: roomCode,
        createdAt: serverTimestamp(),
      });
      
      // Успех, перенаправляем пользователя.
      redirect(`/${roomCode}`);

    } catch (error) {
      // Если есть ошибка (например, права доступа), останавливаемся и сообщаем о ней.
      const errorMessage = getErrorMessage(error);
      console.error(`Ошибка при создании комнаты: ${errorMessage}`);
      return { message: `Не удалось создать комнату: ${errorMessage}` };
    }
  }

  // Если цикл завершился, значит, мы не смогли найти уникальный код.
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

    // Проверяем существование комнаты напрямую по ID
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

    // ID документа комнаты - это сам ID комнаты (код).
    const roomDocRef = doc(db, 'rooms', roomId);
    const roomDocSnap = await getDoc(roomDocRef);

    if (!roomDocSnap.exists()) {
      return { message: 'Комната не найдена.' };
    }

    const messagesColRef = collection(roomDocRef, 'messages');
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
    // ID документа комнаты - это сам ID комнаты (код).
    const messageDocRef = doc(db, 'rooms', roomId, 'messages', messageId);

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
