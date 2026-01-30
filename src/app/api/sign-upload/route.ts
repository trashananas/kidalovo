import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({ 
    cloud_name: CLOUD_NAME, 
    api_key: API_KEY, 
    api_secret: API_SECRET,
    secure: true
  });
}

export async function POST(request: Request) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    return NextResponse.json(
        { error: 'Ошибка конфигурации сервера: Ключи для загрузки файлов не настроены.' }, 
        { status: 500 }
    );
  }

  try {
    const timestamp = Math.round((new Date).getTime()/1000);

    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
    }, API_SECRET);

    return NextResponse.json({
      timestamp,
      signature,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
        { error: `Не удалось создать подпись для загрузки: ${errorMessage}` }, 
        { status: 500 }
    );
  }
}