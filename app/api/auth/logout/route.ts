import { NextResponse } from 'next/server';
import { destroyCurrentSession } from '@/lib/auth/session';

export async function POST() {
  await destroyCurrentSession();
  return new NextResponse(null, { status: 204 });
}
