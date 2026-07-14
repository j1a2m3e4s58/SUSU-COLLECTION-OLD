const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(bytes) {
  let binary = "";
  bytes.forEach((value) => { binary += String.fromCharCode(value); });
  return btoa(binary);
}

function fromBase64(value) {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase, salt) {
  const material = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBackup(payload, passphrase) {
  if (String(passphrase || "").length < 12) {
    throw new Error("Backup passphrase must be at least 12 characters.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    format: "susu-encrypted-backup",
    version: 1,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA256-310000",
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

export async function decryptBackup(wrapper, passphrase) {
  if (wrapper?.format !== "susu-encrypted-backup" || wrapper?.version !== 1) {
    throw new Error("This is not a supported encrypted SUSU backup.");
  }
  try {
    const salt = fromBase64(wrapper.salt);
    const iv = fromBase64(wrapper.iv);
    const ciphertext = fromBase64(wrapper.ciphertext);
    const key = await deriveKey(passphrase, salt);
    const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    throw new Error("Backup passphrase is incorrect or the file is damaged.");
  }
}
