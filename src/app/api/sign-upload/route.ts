import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST(request: Request) {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('Cloudinary Config Missing:', { 
      hasCloudName: !!CLOUD_NAME, 
      hasApiKey: !!API_KEY, 
      hasApiSecret: !!API_SECRET 
    });
    
    let missing = [];
    if (!CLOUD_NAME) missing.push('CLOUD_NAME');
    if (!API_KEY) missing.push('API_KEY');
    if (!API_SECRET) missing.push('API_SECRET');

    return NextResponse.json(
        { error: `Ошибка конфигурации: Не найдены переменные ${missing.join(', ')}. Проверьте настройки Environment Variables в Vercel для этого окружения (Production/Preview).` }, 
        { status: 500 }
    );
  }

  try {
    cloudinary.config({ 
      cloud_name: CLOUD_NAME, 
      api_key: API_KEY, 
      api_secret: API_SECRET,
      secure: true
    });

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
        { error: `Не удалось создать подпись: ${errorMessage}` }, 
        { status: 500 }
    );
  }
}
