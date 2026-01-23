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
    const uploadResult = await new Promise(async (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto',
          folder: 'note-board-uploads',
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
    console.error('Error uploading to Cloudinary:', error);
    return NextResponse.json(
      { error: `Upload failed: ${getErrorMessage(error)}` },
      { status: 500 }
    );
  }
}
