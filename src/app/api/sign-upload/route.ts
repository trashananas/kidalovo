import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST() {
  const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const API_KEY = process.env.CLOUDINARY_API_KEY || process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.error('Missing keys:', { CLOUD_NAME: !!CLOUD_NAME, API_KEY: !!API_KEY, API_SECRET: !!API_SECRET });
    return NextResponse.json(
      { error: 'Ключи Cloudinary не настроены в Environment Variables' },
      { status: 500 }
    );
  }

  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'kidalovo_uploads';
    
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash('sha1')
      .update(`${paramsToSign}${API_SECRET}`)
      .digest('hex');

    return NextResponse.json({
      timestamp,
      signature,
      apiKey: API_KEY,
      cloudName: CLOUD_NAME,
      folder
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Ошибка генерации подписи: ${error instanceof Error ? error.message : 'Unknown'}` },
      { status: 500 }
    );
  }
}