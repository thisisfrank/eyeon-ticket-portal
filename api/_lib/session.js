import crypto from 'node:crypto';
import { HttpError } from './http.js';

const COOKIE = 'portal_session';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new HttpError(500, 'SESSION_SECRET must be set on the server (16+ random characters).');
  }
  return value;
}

const sign = (data) => crypto.createHmac('sha256', secret()).update(data).digest('base64url');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest();

function cookie(value, maxAge) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  return out;
}

// ---------------------------------------------------------------------------
// Access rules

export function allowedClientEntries() {
  return (process.env.CLIENT_EMAILS || '')
    .split(/[\s,;]+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

/** Entries are full emails (jane@acme.com) or whole domains (@acme.com). */
export function isAllowedClient(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return false;
  return allowedClientEntries().some((entry) =>
    entry.startsWith('@') ? normalized.endsWith(entry) : entry === normalized
  );
}

export function passwordMatches(candidate) {
  const expected = process.env.DEV_PASSWORD;
  if (!expected) return false;
  return crypto.timingSafeEqual(sha256(String(candidate)), sha256(expected));
}

/** Short fingerprint of the current developer password. Changing the password signs every developer out. */
export function passwordVersion() {
  return sha256(`${process.env.DEV_PASSWORD || ''}:${secret()}`).toString('base64url').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Session cookie

export function setSession(res, user) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString('base64url');
  res.setHeader('Set-Cookie', cookie(`${payload}.${sign(payload)}`, MAX_AGE_SECONDS));
}

export function clearSession(res) {
  res.setHeader('Set-Cookie', cookie('', 0));
}

/** The signed-in user, or null. Re-checks access on every request so removing an email or changing the password takes effect immediately. */
export function currentUser(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  let user;
  try {
    user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!user?.exp || user.exp < Date.now()) return null;
  if (user.role === 'client') return isAllowedClient(user.email) ? user : null;
  if (user.role === 'developer') return user.pv === passwordVersion() ? user : null;
  return null;
}

export function requireUser(req, role) {
  const user = currentUser(req);
  if (!user) throw new HttpError(401, 'Your session has ended. Please sign in again.');
  if (role && user.role !== role) throw new HttpError(403, 'Only developers can do that.');
  return user;
}

export function publicUser(user) {
  return { role: user.role, email: user.email || null, name: user.name || null };
}

export function features(user) {
  const developer = user.role === 'developer';
  return {
    uploads: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    weeks: developer && Boolean(process.env.SOFTR_WEEKS_TABLE_ID),
    recordUrl: developer ? process.env.SOFTR_RECORD_URL || null : null,
  };
}
