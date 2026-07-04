export const AUTH_COOKIE_NAME = "car_service_session";
export const AUTH_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

export interface AuthSession {
  codePerson: string;
  nameUser: string;
  username: string;
  expiresAt: number;
}

const textEncoder = new TextEncoder();

function getAuthSecret() {
  return (
    process.env.AUTH_SESSION_SECRET ||
    process.env.DATABASE_PASSWORD ||
    "car-service-session-secret"
  );
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

async function createSignature(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(value),
  );

  return bytesToBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

export async function createAuthToken(session: Omit<AuthSession, "expiresAt">) {
  const payload: AuthSession = {
    ...session,
    expiresAt: Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000,
  };
  const encodedPayload = bytesToBase64Url(
    textEncoder.encode(JSON.stringify(payload)),
  );
  const signature = await createSignature(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function readAuthToken(value: string | undefined) {
  if (!value) {
    return null;
  }

  const [encodedPayload, signature] = value.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = await createSignature(encodedPayload);

  if (!timingSafeEqual(signature, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload)),
    ) as AuthSession;

    if (
      !payload.username ||
      !payload.nameUser ||
      payload.expiresAt < Date.now()
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
