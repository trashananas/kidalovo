// src/app/api/sign-upload/route.ts
import { NextResponse } from 'next/server';

// Helper function to convert buffer to hex
const bufferToHex = (buffer: ArrayBuffer): string => {
  return [...new Uint8Array(buffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

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
    const sortedParams = Object.keys(paramsToSign)
      .sort()
      .map(key => `${key}=${paramsToSign[key]}`)
      .join('&');
    
    const stringToSign = `${sortedParams}${apiSecret}`;
    
    // Use Web Crypto API which is compatible with Cloudflare environment
    const encoder = new TextEncoder();
    const data = encoder.encode(stringToSign);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const signature = bufferToHex(hashBuffer);

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
