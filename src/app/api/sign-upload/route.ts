// IMPORTANT: This file is a SERVER-SIDE file.
// It is not and should not be accessible on the client-side.

import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// It's crucial to check for these variables before using them.
const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

// Configure Cloudinary only if all credentials are provided.
if (CLOUD_NAME && API_KEY && API_SECRET) {
  cloudinary.config({ 
    cloud_name: CLOUD_NAME, 
    api_key: API_KEY, 
    api_secret: API_SECRET,
    secure: true
  });
} else {
    // Log a warning during server startup if variables are missing.
    console.warn(`
    ****************************************************************
    *** ВНИМАНИЕ: Переменные окружения Cloudinary не установлены. ***
    ***         Функционал загрузки файлов не будет работать.     ***
    ***      Добавьте их в настройки вашего хостинг-провайдера.    ***
    ****************************************************************
    `);
}

export async function POST(request: Request) {
  // Re-check for variables on each API call to ensure runtime safety.
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('Ошибка конфигурации сервера: переменные окружения Cloudinary не установлены.');
    return NextResponse.json(
        { error: 'Ошибка конфигурации сервера: Ключи для загрузки файлов не настроены. Администратор должен добавить переменные окружения Cloudinary.' }, 
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
    console.error('Ошибка при создании подписи Cloudinary:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
        { error: `Не удалось создать подпись для загрузки: ${errorMessage}` }, 
        { status: 500 }
    );
  }
}
