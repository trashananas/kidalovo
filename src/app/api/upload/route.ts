// src/app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getErrorMessage } from '@/lib/utils';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'auto',
            // It's good practice to place uploads in a specific folder
            folder: 'note-board-uploads',
            // Pass the original filename so Cloudinary uses it for the download
            original_filename: file.name,
          },
          (error, result) => {
            if (error) {
              reject(error);
            }
            resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json(uploadResult);
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return NextResponse.json(
      { error: `Upload failed: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
