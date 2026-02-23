
import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Инициализация Firebase для Edge/Server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-key');
  
  if (secret !== process.env.EXTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, chatId, userId, text, authorName } = body;

    // Действие: Создание чата
    if (action === 'create_chat') {
      const chatRef = doc(db, 'rooms', chatId);
      await setDoc(chatRef, {
        id: chatId,
        code: chatId,
        type: 'chat',
        createdAt: serverTimestamp(),
        creatorId: 'external_system',
        members: {
          [userId]: { role: 'member', name: authorName || 'User' },
          'system': { role: 'owner', name: 'Support' }
        }
      }, { merge: true });
      return NextResponse.json({ success: true, chatId });
    }

    // Действие: Отправка сообщения
    if (action === 'send_message') {
      const messagesCol = collection(db, 'rooms', chatId, 'messages');
      await addDoc(messagesCol, {
        roomId: chatId,
        userId: userId || 'system',
        text: text,
        authorName: authorName || 'System',
        authorColor: '#3b82f6',
        createdAt: serverTimestamp(),
        isDeleted: false,
        // Для обычного чата координаты не нужны, но добавим дефолтные для совместимости со схемой
        position: { x: 0, y: 0 },
        size: { width: 300, height: 100 }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
