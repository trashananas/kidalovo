// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getErrorMessage } from '@/lib/utils';

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

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'Файл не предоставлен' }, { status: 400 });
  }

  try {
    const uploadResult = await new Promise(async (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'kidalovo-uploads',
          // These options ensure the downloaded file will have a meaningful name
          use_filename: true,
          unique_filename: true, // To avoid overwrites
        },
        (error, result) => {
          if (error) {
            reject(error);
          }
          resolve(result);
        }
      );
      
      // Stream the file data to Cloudinary chunk by chunk instead of buffering in memory
      for await (const chunk of file.stream()) {
        uploadStream.write(chunk);
      }
      uploadStream.end();

    });

    return NextResponse.json(uploadResult);
  } catch (error) {
    console.error('Ошибка при загрузке в Cloudinary:', error);
    return NextResponse.json(
      { error: `Загрузка не удалась: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
