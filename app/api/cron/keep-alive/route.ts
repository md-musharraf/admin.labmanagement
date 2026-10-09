import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Supabase free tier pauses after 7 days without database activity. Health/schema
// endpoints don't count, so this runs a real query against a table that exists.
export async function GET(request: Request) {
  const { error } = await supabase.from('customers').select('id').limit(1);

  return NextResponse.json(
    { success: !error, timestamp: new Date().toISOString(), error: error?.message ?? null },
    { status: error ? 500 : 200 }
  );
}

export async function POST(request: Request) {
  return GET(request);
}
