// src/app/api/sign-upload/route.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiSecret) {
    console.error('Ошибка конфигурации сервера: CLOUDINARY_API_SECRET отсутствует.');
    return NextResponse.json(
      { error: 'Ошибка конфигурации сервера: секретный ключ API отсутствует.' },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { paramsToSign } = body;

  if (!paramsToSign) {
    return NextResponse.json(
      { error: 'Параметры для подписи не предоставлены.' },
      { status: 400 }
    );
  }

  try {
    // Логика генерации подписи Cloudinary
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');
    
    const stringToSign = `${sortedParams}${apiSecret}`;
    
    const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    return NextResponse.json({ signature });

  } catch (error) {
    console.error('Ошибка при создании подписи:', error);
    const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { error: `Не удалось создать подпись: ${errorMessage}` },
      { status: 500 }
    );
  }
}
