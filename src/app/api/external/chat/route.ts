
import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Инициализация Firebase для Edge/Server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-key');
  const serverSecret = process.env.EXTERNAL_API_SECRET;
  
  // Проверка: настроен ли секрет на сервере вообще
  if (!serverSecret) {
    console.error('API Error: EXTERNAL_API_SECRET is not configured on the server.');
    return NextResponse.json({ 
      error: 'Server Configuration Error', 
      details: 'API secret is not set in environment variables.' 
    }, { status: 500 });
  }

  if (secret !== serverSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      details: 'The provided x-api-key does not match the server secret.' 
    }, { status: 401 });
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
