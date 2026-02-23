import { NextResponse } from 'next/server';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// Инициализация Firebase для Edge/Server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

const DEFAULT_SECRET = 'kid_prod_secret_2024_safe_key';

// Хелпер для CORS заголовков
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-key');
  // Используем ключ из .env или дефолт
  const serverSecret = process.env.EXTERNAL_API_SECRET || DEFAULT_SECRET;
  
  if (!secret || secret !== serverSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      details: 'Invalid x-api-key. Ensure it matches EXTERNAL_API_SECRET on the server.',
      received: secret ? 'HIDDEN' : 'MISSING'
    }, { 
      status: 401,
      headers: corsHeaders
    });
  }

  try {
    const body = await request.json();
    const { action, chatId, userId, text, authorName } = body;

    if (!chatId) {
       return NextResponse.json({ error: 'chatId is required' }, { status: 400, headers: corsHeaders });
    }

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
          [userId || 'user_1']: { role: 'member', name: authorName || 'User' },
          'system': { role: 'owner', name: 'Support' }
        }
      }, { merge: true });
      return NextResponse.json({ success: true, chatId }, { headers: corsHeaders });
    }

    // Действие: Отправка сообщения
    if (action === 'send_message') {
      const messagesCol = collection(db, 'rooms', chatId, 'messages');
      await addDoc(messagesCol, {
        roomId: chatId,
        userId: userId || 'system',
        text: text || '',
        authorName: authorName || 'System',
        authorColor: '#3b82f6',
        createdAt: serverTimestamp(),
        isDeleted: false,
        position: { x: 0, y: 0 },
        size: { width: 300, height: 130 }
      });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error('External API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
