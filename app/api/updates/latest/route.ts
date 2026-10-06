import { NextRequest, NextResponse } from 'next/server';
import { readUpdates, toSoftwareUpdate } from '@/lib/fileDb';
import { supabase } from '@/lib/supabaseClient';

const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!isDemoMode) {
      const { data, error } = await supabase
        .from('app_updates')
        .select('*')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      return NextResponse.json(data ? { success: true, update: toSoftwareUpdate(data) } : { success: false, reason: 'No updates found' });
    }
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
