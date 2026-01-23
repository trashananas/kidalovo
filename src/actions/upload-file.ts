'use server';

import { v2 as cloudinary } from 'cloudinary';
import { z } from 'zod';
import { getErrorMessage } from '@/lib/utils';

// Configure Cloudinary using environment variables
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
} catch (error) {
    console.error("Cloudinary config error:", error);
}


const UploadResponseSchema = z.object({
  url: z.string().url(),
  name: z.string(),
  type: z.string(),
  size: z.number(),
});

export type UploadResponse = z.infer<typeof UploadResponseSchema>;

export async function uploadFile(
  formData: FormData
): Promise<
  { success: true; data: UploadResponse } | { success: false; error: string }
> {
  // Check if Cloudinary is configured
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      const errorMessage = "Cloudinary is not configured. Please check your environment variables.";
      console.error(errorMessage);
      return { success: false, error: errorMessage };
  }
    
  const file = formData.get('file') as File | null;

  if (!file) {
    return { success: false, error: 'Файл не предоставлен.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'auto', 
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });
    
    // The resource_type might be 'image', 'video', 'raw' etc.
    // The format is the file extension like 'jpg', 'mp4', 'pdf'.
    const fileType = uploadResult.resource_type === 'raw' 
      ? file.type // for raw files like pdf, zip, use the original mime type
      : `${uploadResult.resource_type}/${uploadResult.format}`;


    const validatedData = UploadResponseSchema.parse({
      url: uploadResult.secure_url,
      name: file.name,
      type: fileType, 
      size: uploadResult.bytes,
    });

    return { success: true, data: validatedData };
  } catch (error) {
    console.error('File upload action error:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
