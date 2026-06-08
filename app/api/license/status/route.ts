import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { readCustomers } from '@/lib/fileDb';

export const dynamic = 'force-dynamic';

const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');

    if (!machineId) {
      return NextResponse.json({ success: false, error: 'machineId query parameter is required' }, { status: 400 });
    }

    if (isDemoMode) {
      const list = readCustomers();
      const customer = list.find((c) => c.machine_id.trim().toLowerCase() === machineId.trim().toLowerCase());
      
      if (customer) {
        return NextResponse.json({
          success: true,
          status: customer.status || 'ACTIVE',
          expiryDate: customer.expiry_date,
          licenseKey: customer.license_key,
        });
      } else {
        return NextResponse.json({
          success: false,
          status: 'DELETED',
          reason: 'Machine ID not registered in database'
        }, { status: 404 });
      }
    }

    // Supabase Mode
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('machine_id', machineId)
      .maybeSingle();

    if (error) {
      console.error('Supabase error checking license status:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (data) {
      // If Supabase table doesn't have status, check local fileDb as a fallback
      let status = data.status;
      if (!status) {
        const fileList = readCustomers();
        const fileCust = fileList.find(c => c.machine_id.trim().toLowerCase() === machineId.trim().toLowerCase());
        status = fileCust?.status || 'ACTIVE';
      }

      return NextResponse.json({
        success: true,
        status: status,
        expiryDate: data.expiry_date,
        licenseKey: data.license_key,
      });
    } else {
      return NextResponse.json({
        success: false,
        status: 'DELETED',
        reason: 'Machine ID not registered in database'
      }, { status: 404 });
    }
  } catch (err: any) {
    console.error('Failed to retrieve license status:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
