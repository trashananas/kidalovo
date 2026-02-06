import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json({ error: 'Используйте встроенную систему загрузки Firestore' }, { status: 410 });
}
