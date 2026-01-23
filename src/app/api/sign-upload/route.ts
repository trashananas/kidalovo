// IMPORTANT: This file is a SERVER-SIDE file.
// It is not and should not be accessible on the client-side.

import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary with your credentials.
if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({ 
    cloud_name: CLOUD_NAME, 
    api_key: API_KEY, 
    api_secret: API_SECRET,
    secure: true
  });
}

export async function POST(request: Request) {
  // Check if Cloudinary is configured
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('Ошибка конфигурации сервера: переменные окружения Cloudinary не установлены.');
    return NextResponse.json(
        { error: 'Ошибка конфигурации сервера: переменные окружения Cloudinary не установлены.' }, 
        { status: 500 }
    );
  }

  try {
    const timestamp = Math.round((new Date).getTime()/1000);

    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
    }, API_SECRET);

    return NextResponse.json({ timestamp, signature });

  } catch (error) {
    console.error('Ошибка при создании подписи Cloudinary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
        { error: `Не удалось создать подпись: ${errorMessage}` }, 
        { status: 500 }
    );
  }
}
