'use server';

import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  runTransaction,
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
  let roomCode = '';
  let success = false;
  let attempts = 0;

  // Пытаемся найти уникальный код несколько раз.
  while (!success && attempts < 10) {
    attempts++;
    const currentCode = generateRoomCode();
    try {
      // Используем транзакцию для атомарной проверки существования и создания.
      await runTransaction(db, async (transaction) => {
        const roomRef = doc(db, 'rooms', currentCode);
        const roomSnap = await transaction.get(roomRef);

        if (roomSnap.exists()) {
          // Код комнаты уже занят, транзакция прервется, и мы попробуем снова.
          console.log(`Код комнаты ${currentCode} уже существует. Повторная попытка...`);
          return;
        }

        // Код комнаты уникален, создаем новую комнату.
        transaction.set(roomRef, {
          code: currentCode,
          createdAt: serverTimestamp(),
        });

        // Если мы дошли до сюда, транзакция готова к выполнению.
        roomCode = currentCode;
        success = true;
      });
    } catch (error) {
      // Транзакция не удалась. Логгируем ошибку и позволяем циклу попробовать снова.
      console.error('Транзакция создания комнаты не удалась:', getErrorMessage(error));
    }
  }

  if (!success) {
    return { message: 'Не удалось создать уникальную комнату. Пожалуйста, попробуйте еще раз.' };
  }

  redirect(`/${roomCode}`);
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
