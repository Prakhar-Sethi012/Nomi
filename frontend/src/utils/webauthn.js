// Native Face ID / Touch ID / fingerprint support via the browser's Web
// Authentication API (navigator.credentials). This is frontend boilerplate
// to get the OS-level biometric prompt actually triggering — the
// cryptographic verification a real deployment needs (the backend checking
// the assertion's signature against the public key it stored at
// registration) is mocked: registerBiometric() just stashes the already-
// issued JWT alongside the credential, and loginWithBiometric() replays it
// once the OS confirms the user's biometric. A production version would
// have the server generate the challenge and verify the assertion instead
// of trusting a successful `credentials.get()` on its own.

const STORAGE_KEY = 'cc_biometric_credential';

export const isBiometricSupported = () =>
  typeof window !== 'undefined' && !!window.PublicKeyCredential && !!navigator.credentials;

export const hasBiometricCredential = () => !!localStorage.getItem(STORAGE_KEY);

const randomChallenge = () => crypto.getRandomValues(new Uint8Array(32));

const bufferToBase64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const base64ToBuffer = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Creates a platform credential (Face ID/Touch ID/fingerprint) and stores its
// id alongside the reg_no + current token, so a later biometric login can
// prove identity to the OS and then just replay that token.
export async function registerBiometric({ regNo, token }) {
  if (!isBiometricSupported()) throw new Error('Biometric auth is not supported on this device.');

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: 'Command Center' },
      user: {
        id: new TextEncoder().encode(regNo),
        name: regNo,
        displayName: regNo,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
      timeout: 60000,
    },
  });

  const record = { credentialId: bufferToBase64(credential.rawId), regNo, token };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record;
}

export function clearBiometricCredential() {
  localStorage.removeItem(STORAGE_KEY);
}

// Triggers the OS biometric prompt and, on success, hands back the reg_no
// and token stashed at registration time — or null if nothing was ever
// registered on this device.
export async function loginWithBiometric() {
  if (!isBiometricSupported()) throw new Error('Biometric auth is not supported on this device.');

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const record = JSON.parse(raw);

  await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      allowCredentials: [{ id: base64ToBuffer(record.credentialId), type: 'public-key' }],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return record;
}
