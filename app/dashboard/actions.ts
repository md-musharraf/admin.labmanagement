'use server';

import { supabase } from '@/lib/supabaseClient';
import { encrypt, decrypt } from '@/lib/keygen';
import { revalidatePath } from 'next/cache';

export interface Customer {
  id: string;
  created_at: string;
  lab_name: string;
  owner_name: string;
  phone: string;
  machine_id: string;
  expiry_date: string;
  license_key: string;
}

// Check if we are running in demo mode with dummy credentials
const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

// Server-side in-memory mock database for demo fallback
let mockCustomers: Customer[] = [
  {
    id: 'mock-uuid-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
    lab_name: 'Apex Pathology & Diagnostics',
    owner_name: 'Dr. Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    machine_id: 'MAC-APEX-9982X',
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(), // Expiring in 25 days (soon)
    license_key: '',
  },
  {
    id: 'mock-uuid-2',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60 days ago
    lab_name: 'BioHealth Laboratory Services',
    owner_name: 'Dr. Charles Xavier',
    phone: '+1 (555) 876-5432',
    machine_id: 'MAC-BIOH-1102A',
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString(), // Active for 300 days
    license_key: '',
  },
  {
    id: 'mock-uuid-3',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(), // 120 days ago
    lab_name: 'Horizon Clinical Pathology',
    owner_name: 'Dr. Bruce Banner',
    phone: '+1 (555) 432-1098',
    machine_id: 'MAC-HORZ-4402Z',
    expiry_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(), // Expired 12 days ago
    license_key: '',
  },
];

// Initialize license keys for mock database
mockCustomers.forEach((c) => {
  if (!c.license_key) {
    c.license_key = encrypt(c.machine_id, c.expiry_date);
  }
});

/**
 * Checks if the system is running in demo/mock database fallback mode.
 */
export async function checkDemoMode() {
  return isDemoMode;
}

/**
 * Fetches all customers from Supabase or returns in-memory mock data.
 */
export async function fetchCustomers() {
  if (isDemoMode) {
    // Sort in-memory list by created_at descending
    const sorted = [...mockCustomers].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return { success: true, data: sorted, isDemo: true };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching customers:', error);
      return { error: error.message };
    }

    return { success: true, data: (data || []) as Customer[], isDemo: false };
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Creates a new customer with a generated license key.
 */
export async function createCustomer(formData: {
  labName: string;
  ownerName: string;
  phone: string;
  machineId: string;
  planDuration: string;
}) {
  const { labName, ownerName, phone, machineId, planDuration } = formData;

  if (!labName || !ownerName || !phone || !machineId || !planDuration) {
    return { error: 'All fields are required' };
  }

  // Calculate expiry date
  const expiry = new Date();
  if (planDuration === '1 Month') {
    expiry.setMonth(expiry.getMonth() + 1);
  } else if (planDuration === '6 Months') {
    expiry.setMonth(expiry.getMonth() + 6);
  } else if (planDuration === '2 Years') {
    expiry.setFullYear(expiry.getFullYear() + 2);
  } else {
    // Default to 1 Year
    expiry.setFullYear(expiry.getFullYear() + 1);
  }
  const expiryStr = expiry.toISOString();

  // Generate license key using keygen helper
  const licenseKey = encrypt(machineId, expiryStr);

  if (isDemoMode) {
    const newCust: Customer = {
      id: `mock-uuid-${Date.now()}`,
      created_at: new Date().toISOString(),
      lab_name: labName,
      owner_name: ownerName,
      phone,
      machine_id: machineId,
      expiry_date: expiryStr,
      license_key: licenseKey,
    };
    mockCustomers.push(newCust);
    revalidatePath('/dashboard');
    return { success: true, data: newCust, isDemo: true };
  }

  try {
    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          lab_name: labName,
          owner_name: ownerName,
          phone,
          machine_id: machineId,
          expiry_date: expiryStr,
          license_key: licenseKey,
        },
      ])
      .select();

    if (error) {
      console.error('Supabase error inserting customer:', error);
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, data: data?.[0], isDemo: false };
  } catch (err: any) {
    console.error('Error creating customer:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Renews a customer's license by extending it by 1 year and regenerating the key.
 */
export async function renewLicense(id: string, machineId: string) {
  if (!id || !machineId) {
    return { error: 'Customer ID and Machine ID are required' };
  }

  // Set the new expiry to 1 year from now
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const expiryStr = expiry.toISOString();

  // Generate new license key
  const licenseKey = encrypt(machineId, expiryStr);

  if (isDemoMode) {
    const index = mockCustomers.findIndex((c) => c.id === id);
    if (index !== -1) {
      mockCustomers[index] = {
        ...mockCustomers[index],
        expiry_date: expiryStr,
        license_key: licenseKey,
      };
      revalidatePath('/dashboard');
      return { success: true, isDemo: true };
    }
    return { error: 'Customer not found' };
  }

  try {
    const { error } = await supabase
      .from('customers')
      .update({
        expiry_date: expiryStr,
        license_key: licenseKey,
      })
      .eq('id', id);

    if (error) {
      console.error('Supabase error renewing license:', error);
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, isDemo: false };
  } catch (err: any) {
    console.error('Error renewing license:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Deletes a customer.
 */
export async function deleteCustomer(id: string) {
  if (!id) {
    return { error: 'Customer ID is required' };
  }

  if (isDemoMode) {
    mockCustomers = mockCustomers.filter((c) => c.id !== id);
    revalidatePath('/dashboard');
    return { success: true, isDemo: true };
  }

  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);

    if (error) {
      console.error('Supabase error deleting customer:', error);
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, isDemo: false };
  } catch (err: any) {
    console.error('Error deleting customer:', err);
    return { error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Decrypts a license key and returns the decrypted payload parameters.
 */
export async function verifyLicenseKey(licenseKey: string) {
  try {
    const decrypted = decrypt(licenseKey);
    return { success: true, machineId: decrypted.machineId, expirationDate: decrypted.expirationDate };
  } catch (err: any) {
    return { error: err.message || 'Verification failed: invalid key structure' };
  }
}
