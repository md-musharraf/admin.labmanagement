const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64urlEncode(str: string): string {
  const binary = encoder.encode(str);
  let binaryStr = '';
  binary.forEach((b) => {
    binaryStr += String.fromCharCode(b);
  });
  return btoa(binaryStr)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(b64url: string): string {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return decoder.decode(bytes);
}

function base64urlToBytes(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) {
    b64 += '=';
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Signs a session payload using HMAC-SHA256.
 */
export async function signSession(payload: { expiresAt: number }, secret: string): Promise<string> {
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(payloadStr);

  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(payloadB64)
  );

  const signatureBytes = new Uint8Array(signatureBuffer);
  let signatureBinary = '';
  signatureBytes.forEach((b) => {
    signatureBinary += String.fromCharCode(b);
  });
  const signatureB64 = btoa(signatureBinary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${payloadB64}.${signatureB64}`;
}

/**
 * Verifies a session token signature and check expiration.
 */
export async function verifySession(token: string, secret: string): Promise<{ expiresAt: number } | null> {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, signatureB64] = parts;

  try {
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const signatureBytes = base64urlToBytes(signatureB64);
    const payloadBytes = encoder.encode(payloadB64);

    const isValid = await crypto.subtle.verify(
      'HMAC',
      cryptoKey,
      signatureBytes as any,
      payloadBytes as any
    );

    if (!isValid) return null;

    const payloadStr = base64urlDecode(payloadB64);
    const payload = JSON.parse(payloadStr);
    
    if (payload.expiresAt < Date.now()) {
      return null; // Session expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}
