import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const startTime = Date.now();
  const results: Record<string, any> = {};

  try {
    // 1. Ping Supabase Client Database Table
    const { data: dbData, error: dbError } = await supabase
      .from('licenses')
      .select('count', { count: 'exact', head: true });

    results.supabaseClient = {
      success: !dbError,
      error: dbError ? dbError.message : null,
    };

    // 2. Direct HTTP Ping to Supabase REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lcjuaimfowitnollrath.supabase.co';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && anonKey) {
      const restRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
        cache: 'no-store',
      });
      results.supabaseRestApi = {
        status: restRes.status,
        ok: restRes.ok,
      };

      // 3. Direct HTTP Ping to Supabase Auth API
      const authRes = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/health`, {
        headers: {
          apikey: anonKey,
        },
        cache: 'no-store',
      });
      results.supabaseAuthHealth = {
        status: authRes.status,
        ok: authRes.ok,
      };
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      executionTimeMs: duration,
      project: 'admin_dashboard_lab',
      message: 'Supabase keep-alive ping executed successfully. Server will remain active.',
      details: results,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: error?.message || String(error),
        details: results,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  return GET(request);
}
