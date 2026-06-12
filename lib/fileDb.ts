import fs from 'fs';
import path from 'path';
import { Customer } from '../app/dashboard/actions';

export interface SoftwareUpdate {
  version: string;
  title: string;
  releaseNotes: string;
  downloadUrl: string;
  isCritical: boolean;
  publishedAt: string;
}

const CUSTOMERS_FILE = path.join(process.cwd(), 'customers_db.json');
const UPDATES_FILE = path.join(process.cwd(), 'updates_db.json');

const DEFAULT_CUSTOMERS: Customer[] = [
  {
    id: 'mock-uuid-1',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    lab_name: 'Apex Pathology & Diagnostics',
    owner_name: 'Dr. Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    machine_id: 'MAC-APEX-9982X',
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 25).toISOString(),
    license_key: '',
    status: 'ACTIVE',
    price: 15000,
  },
  {
    id: 'mock-uuid-2',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    lab_name: 'BioHealth Laboratory Services',
    owner_name: 'Dr. Charles Xavier',
    phone: '+1 (555) 876-5432',
    machine_id: 'MAC-BIOH-1102A',
    expiry_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 300).toISOString(),
    license_key: '',
    status: 'ACTIVE',
    price: 45000,
  },
  {
    id: 'mock-uuid-3',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 120).toISOString(),
    lab_name: 'Horizon Clinical Pathology',
    owner_name: 'Dr. Bruce Banner',
    phone: '+1 (555) 432-1098',
    machine_id: 'MAC-HORZ-4402Z',
    expiry_date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    license_key: '',
    status: 'ACTIVE',
    price: 0,
  },
];

const DEFAULT_UPDATES: SoftwareUpdate[] = [
  {
    version: '1.0.0',
    title: 'Initial Release',
    releaseNotes: 'Initial production-ready offline pathology LIS release.',
    downloadUrl: 'https://example.com/downloads/lis-1.0.0.exe',
    isCritical: false,
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
  }
];

export function readCustomers(): Customer[] {
  try {
    if (!fs.existsSync(CUSTOMERS_FILE)) {
      fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(DEFAULT_CUSTOMERS, null, 2));
      return DEFAULT_CUSTOMERS;
    }
    const data = fs.readFileSync(CUSTOMERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read customers DB file:', e);
    return DEFAULT_CUSTOMERS;
  }
}

export function writeCustomers(customers: Customer[]) {
  try {
    fs.writeFileSync(CUSTOMERS_FILE, JSON.stringify(customers, null, 2));
  } catch (e) {
    console.error('Failed to write customers DB file:', e);
  }
}

export function readUpdates(): SoftwareUpdate[] {
  try {
    if (!fs.existsSync(UPDATES_FILE)) {
      fs.writeFileSync(UPDATES_FILE, JSON.stringify(DEFAULT_UPDATES, null, 2));
      return DEFAULT_UPDATES;
    }
    const data = fs.readFileSync(UPDATES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to read updates DB file:', e);
    return DEFAULT_UPDATES;
  }
}

export function writeUpdates(updates: SoftwareUpdate[]) {
  try {
    fs.writeFileSync(UPDATES_FILE, JSON.stringify(updates, null, 2));
  } catch (e) {
    console.error('Failed to write updates DB file:', e);
  }
}
