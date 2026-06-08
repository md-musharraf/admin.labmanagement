'use server';

import { supabase } from '@/lib/supabaseClient';
import { encrypt, decrypt } from '@/lib/keygen';
import { revalidatePath } from 'next/cache';
import { readCustomers, writeCustomers, readUpdates, writeUpdates, SoftwareUpdate } from '@/lib/fileDb';

export interface Customer {
  id: string;
  created_at: string;
  lab_name: string;
  owner_name: string;
  phone: string;
  machine_id: string;
  expiry_date: string;
  license_key: string;
  status: string; // 'ACTIVE' | 'PAUSED' | 'STOPPED'
}

// Check if we are running in demo mode with dummy credentials
const isDemoMode =
  !process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL.includes('dummy') ||
  !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('dummy');

// Initialize licenses in fileDb if they are missing license keys
try {
  const current = readCustomers();
  let updated = false;
  current.forEach((c) => {
    if (!c.license_key) {
      c.license_key = encrypt(c.machine_id, c.expiry_date);
      updated = true;
    }
    if (!c.status) {
      c.status = 'ACTIVE';
      updated = true;
    }
  });
  if (updated) {
    writeCustomers(current);
  }
} catch (e) {
  console.error('Error initializing default file DB keys:', e);
}

/**
 * Checks if the system is running in demo/mock database fallback mode.
 */
export async function checkDemoMode() {
  return isDemoMode;
}

/**
 * Fetches all customers from Supabase or returns mock file data.
 */
export async function fetchCustomers() {
  if (isDemoMode) {
    const list = readCustomers();
    const sorted = [...list].sort(
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

    // Map to guarantee status is always present
    const mapped = (data || []).map((c: any) => ({
      ...c,
      status: c.status || 'ACTIVE'
    })) as Customer[];

    return { success: true, data: mapped, isDemo: false };
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

  const expiry = new Date();
  if (planDuration === '1 Month') {
    expiry.setMonth(expiry.getMonth() + 1);
  } else if (planDuration === '6 Months') {
    expiry.setMonth(expiry.getMonth() + 6);
  } else if (planDuration === '2 Years') {
    expiry.setFullYear(expiry.getFullYear() + 2);
  } else {
    expiry.setFullYear(expiry.getFullYear() + 1);
  }
  const expiryStr = expiry.toISOString();
  const licenseKey = encrypt(machineId, expiryStr);

  if (isDemoMode) {
    const list = readCustomers();
    const newCust: Customer = {
      id: `mock-uuid-${Date.now()}`,
      created_at: new Date().toISOString(),
      lab_name: labName,
      owner_name: ownerName,
      phone,
      machine_id: machineId,
      expiry_date: expiryStr,
      license_key: licenseKey,
      status: 'ACTIVE',
    };
    list.push(newCust);
    writeCustomers(list);
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
          status: 'ACTIVE'
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

  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1);
  const expiryStr = expiry.toISOString();
  const licenseKey = encrypt(machineId, expiryStr);

  if (isDemoMode) {
    const list = readCustomers();
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        expiry_date: expiryStr,
        license_key: licenseKey,
      };
      writeCustomers(list);
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
    let list = readCustomers();
    list = list.filter((c) => c.id !== id);
    writeCustomers(list);
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
 * Updates a customer's license status (ACTIVE | PAUSED | STOPPED)
 */
export async function updateCustomerStatus(id: string, status: 'ACTIVE' | 'PAUSED' | 'STOPPED') {
  if (!id || !status) {
    return { error: 'Customer ID and status are required' };
  }

  if (isDemoMode) {
    const list = readCustomers();
    const index = list.findIndex((c) => c.id === id);
    if (index !== -1) {
      list[index] = {
        ...list[index],
        status: status,
      };
      writeCustomers(list);
      revalidatePath('/dashboard');
      return { success: true, isDemo: true };
    }
    return { error: 'Customer not found' };
  }

  try {
    const { error } = await supabase
      .from('customers')
      .update({ status: status })
      .eq('id', id);

    if (error) {
      console.error('Supabase error updating status:', error);
      // Suppress missing column error for demo robustness
      if (error.message.includes('column') || error.message.includes('status')) {
        console.warn('Supabase customers table lacks status column. Saving status locally in fileDb fallback.');
        const list = readCustomers();
        const index = list.findIndex((c) => c.id === id);
        if (index !== -1) {
          list[index] = { ...list[index], status };
          writeCustomers(list);
        }
        revalidatePath('/dashboard');
        return { success: true, warning: 'Lacks database column, updated locally', isDemo: false };
      }
      return { error: error.message };
    }

    revalidatePath('/dashboard');
    return { success: true, isDemo: false };
  } catch (err: any) {
    console.error('Error updating status:', err);
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

/**
 * Pushes a new software update version.
 */
export async function pushSoftwareUpdate(formData: {
  version: string;
  title: string;
  releaseNotes: string;
  downloadUrl: string;
  isCritical: boolean;
}) {
  const { version, title, releaseNotes, downloadUrl, isCritical } = formData;
  if (!version || !title || !releaseNotes || !downloadUrl) {
    return { error: 'All update fields are required' };
  }

  try {
    const updates = readUpdates();
    const newUpdate: SoftwareUpdate = {
      version,
      title,
      releaseNotes,
      downloadUrl,
      isCritical,
      publishedAt: new Date().toISOString(),
    };
    // Prepend so that the latest version is first
    updates.unshift(newUpdate);
    writeUpdates(updates);
    revalidatePath('/dashboard');
    return { success: true, data: newUpdate };
  } catch (err: any) {
    console.error('Failed to push update:', err);
    return { error: err.message || 'Failed to save update' };
  }
}

/**
 * Fetches all updates.
 */
export async function fetchSoftwareUpdates() {
  try {
    const updates = readUpdates();
    return { success: true, data: updates };
  } catch (err: any) {
    return { error: err.message || 'Failed to fetch updates' };
  }
}
