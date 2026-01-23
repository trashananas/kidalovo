// IMPORTANT: This file is a SERVER-SIDE file.
// It is not and should not be accessible on the client-side.

import { v2 as cloudinary } from 'cloudinary';
import { NextResponse } from 'next/server';

// Configure Cloudinary with your credentials.
// These are server-side environment variables.
cloudinary.config({ 
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export async function POST(request: Request) {
  try {
    const timestamp = Math.round((new Date).getTime()/1000);

    // Use the a new `sign` method to create the signature
    const signature = cloudinary.utils.api_sign_request({
      timestamp: timestamp,
    }, process.env.CLOUDINARY_API_SECRET!);

    return NextResponse.json({ timestamp, signature });

  } catch (error) {
    console.error('Error creating Cloudinary signature:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
        { error: `Failed to create signature: ${errorMessage}` }, 
        { status: 500 }
    );
  }
}
