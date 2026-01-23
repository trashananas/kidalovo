// src/app/api/sign-upload/route.ts
import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('Ошибка конфигурации сервера: ключи Cloudinary отсутствуют.');
    return NextResponse.json(
      { error: 'Ошибка конфигурации сервера: ключи Cloudinary отсутствуют.' },
      { status: 500 }
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });

  const body = await request.json();
  const { paramsToSign } = body;

  try {
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      apiSecret as string
    );
    return NextResponse.json({ signature });
  } catch (error) {
    console.error('Ошибка при подписи загрузки:', error);
    return NextResponse.json(
      { error: 'Не удалось подписать загрузку' },
      { status: 500 }
    );
  }
}
