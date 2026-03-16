import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { DEFAULT_EXTERNAL_API_SECRET } from '@/lib/constants';

// Инициализация Admin SDK (использует полные права доступа)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

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
  const serverSecret = process.env.EXTERNAL_API_SECRET || DEFAULT_EXTERNAL_API_SECRET;
  
  if (!secret || secret !== serverSecret) {
    return NextResponse.json({ 
      error: 'Unauthorized', 
      details: 'Invalid x-api-key. Ensure it matches EXTERNAL_API_SECRET on the server.'
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
      const chatRef = db.collection('rooms').doc(chatId);
      await chatRef.set({
        id: chatId,
        code: chatId,
        type: 'chat',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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
      const messagesCol = db.collection('rooms').doc(chatId).collection('messages');
      await messagesCol.add({
        roomId: chatId,
        userId: userId || 'system',
        text: text || '',
        authorName: authorName || 'System',
        authorColor: '#3b82f6',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        isDeleted: false,
        position: { x: 0, y: 0 },
        size: { width: 300, height: 170 }
      });
      return NextResponse.json({ success: true }, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch (error: any) {
    console.error('External API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
