import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

export async function POST() {
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    let missing = [];
    if (!CLOUD_NAME) missing.push('CLOUD_NAME');
    if (!API_KEY) missing.push('API_KEY');
    if (!API_SECRET) missing.push('API_SECRET');

    return NextResponse.json(
      { error: `Конфигурация неполная. Отсутствуют: ${missing.join(', ')}. Проверьте Environment Variables в Vercel.` },
      { status: 500 }
    );
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = crypto
      .createHash('sha1')
      .update(`timestamp=${timestamp}${API_SECRET}`)
      .digest('hex');

    return NextResponse.json({
      timestamp,
      signature,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Ошибка при создании подписи: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}
