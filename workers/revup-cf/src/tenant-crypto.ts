// Compatible with apps/common/encryption.py. No plaintext fallback.
export interface TenantCryptoEnv { TENANT_FIELD_KEY?: string; DJANGO_SECRET_KEY?: string; ENCRYPTION_KEY_SALT?: string; }
const encoder = new TextEncoder();
async function fieldKey(env: TenantCryptoEnv) {
  // Production can carry only the derived field key, not Django's root secret.
  if (env.TENANT_FIELD_KEY) {
    const raw=Uint8Array.from(atob(env.TENANT_FIELD_KEY),c=>c.charCodeAt(0));
    if(raw.length!==32) throw new Error("Messaging encryption key has invalid length.");
    return crypto.subtle.importKey("raw",raw,{name:"AES-GCM"},false,["encrypt","decrypt"]);
  }
  if (!env.DJANGO_SECRET_KEY || !env.ENCRYPTION_KEY_SALT) throw new Error("Messaging encryption configuration is missing.");
  const material = await crypto.subtle.importKey("raw", encoder.encode(env.DJANGO_SECRET_KEY), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({name:"HKDF", hash:"SHA-256", salt:encoder.encode(env.ENCRYPTION_KEY_SALT), info:encoder.encode("brightbean-field-encryption")}, material, {name:"AES-GCM", length:256}, false, ["encrypt","decrypt"]);
}
export async function encryptTenantKey(value: string, env: TenantCryptoEnv): Promise<string> {
  const key=await fieldKey(env), nonce=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM", iv:nonce},key,encoder.encode(value)));
  const raw=new Uint8Array(12+ciphertext.length);raw.set(nonce);raw.set(ciphertext,12);
  return btoa(String.fromCharCode(...raw));
}
export async function decryptTenantKey(value: string, env: TenantCryptoEnv): Promise<string> {
  try {
    const key=await fieldKey(env), raw=Uint8Array.from(atob(value),c=>c.charCodeAt(0));
    if(raw.length<28) throw new Error("invalid encrypted value");
    return new TextDecoder("utf-8",{fatal:true}).decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:raw.slice(0,12)},key,raw.slice(12)));
  } catch { throw new Error("Messaging key could not be read securely. Contact support."); }
}
