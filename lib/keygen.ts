import crypto from 'crypto';
import { PRODUCTS, type Product } from './products';

const SALT = process.env.LICENSE_SECRET_SALT || 'Musharraf_709121SaltKey';

// Derive a 32-byte key from the salt key using SHA-256
const KEY = crypto.createHash('sha256').update(SALT).digest();

/**
 * Encrypts the payload "MACHINE_ID|EXPIRATION_DATE[|TAG]" using AES-256-CBC.
 * Returns a unified uppercase hex string containing the IV and the encrypted payload.
 */
export function encrypt(machineId: string, expirationDate: string, product: Product = 'pathlab'): string {
  const tag = PRODUCTS[product].tag;
  const payload = tag ? `${machineId}|${expirationDate}|${tag}` : `${machineId}|${expirationDate}`;
  const iv = crypto.randomBytes(16); // 16 bytes = 128 bits IV

  const cipher = crypto.createCipheriv('aes-256-cbc', KEY, iv);
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Prepend IV (32 hex characters) to the ciphertext
  const licenseKey = iv.toString('hex') + encrypted;
  return licenseKey.toUpperCase();
}

/**
 * Decrypts a license key string and returns the machine ID, expiration date and product.
 */
export function decrypt(licenseKey: string): { machineId: string; expirationDate: string; product: Product } {
  const cleanKey = licenseKey.trim().toLowerCase();

  // An IV in hex is 32 characters. License key must be at least that + some ciphertext.
  if (cleanKey.length <= 32) {
    throw new Error('Invalid license key format');
  }

  const ivHex = cleanKey.substring(0, 32);
  const encryptedHex = cleanKey.substring(32);

  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', KEY, iv);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  const parts = decrypted.split('|');
  if (parts.length < 2) {
    throw new Error('Decrypted payload does not contain separator');
  }

  return {
    machineId: parts[0],
    expirationDate: parts[1],
    product: parts[2] === PRODUCTS.medbilling.tag ? 'medbilling' : 'pathlab',
  };
}
