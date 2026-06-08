import { NextRequest, NextResponse } from 'next/server';
import { readUpdates } from '@/lib/fileDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const list = readUpdates();
    if (list && list.length > 0) {
      return NextResponse.json({
        success: true,
        update: list[0] // Since we prepend new updates, index 0 is always the latest
      });
    }
    return NextResponse.json({
      success: false,
      reason: 'No updates found'
    });
  } catch (err: any) {
    console.error('Failed to retrieve latest update:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
