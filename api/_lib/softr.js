import { HttpError } from './http.js';

const API = 'https://tables-api.softr.io/api/v1';
export const SOFTR_FILE_ORIGIN = 'https://tables-api.softr.io/';

export function settings() {
  const env = process.env;
  const required = ['SOFTR_API_KEY', 'SOFTR_DATABASE_ID', 'SOFTR_TICKETS_TABLE_ID', 'SOFTR_REPLIES_TABLE_ID'];
  const missing = required.filter((key) => !env[key]);
  if (missing.length) {
    throw new HttpError(500, `The server is missing ${missing.join(', ')}. Add them to the environment variables.`);
  }
  return {
    apiKey: env.SOFTR_API_KEY,
    databaseId: env.SOFTR_DATABASE_ID,
    tables: {
      tickets: env.SOFTR_TICKETS_TABLE_ID,
      replies: env.SOFTR_REPLIES_TABLE_ID,
      weeks: env.SOFTR_WEEKS_TABLE_ID || null,
    },
  };
}

export function tableId(key) {
  const id = settings().tables[key];
  if (!id) throw new HttpError(404, `The ${key} table is not configured.`);
  return id;
}

async function call(path, { method = 'GET', body } = {}) {
  const { apiKey, databaseId } = settings();
  const response = await fetch(`${API}/databases/${databaseId}/${path}`, {
    method,
    headers: {
      'Softr-Api-Key': apiKey,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  if (!response.ok) {
    const detail = parsed?.message || parsed?.error || `responded with ${response.status}`;
    throw new HttpError(response.status === 404 ? 404 : 502, `Softr: ${detail}`, response.status);
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Schema: field names -> field definitions (Softr writes require field IDs)

let schemaCache = { at: 0, value: null };

async function loadSchema() {
  if (schemaCache.value && Date.now() - schemaCache.at < 5 * 60 * 1000) return schemaCache.value;
  const { tables } = settings();
  const value = {};
  await Promise.all(
    Object.entries(tables)
      .filter(([, id]) => id)
      .map(async ([key, id]) => {
        const body = await call(`tables/${id}`);
        const table = body?.data ?? body;
        value[key] = new Map((table?.fields || []).map((field) => [field.name, field]));
      })
  );
  schemaCache = { at: Date.now(), value };
  return value;
}

export async function field(tableKey, name) {
  const schema = await loadSchema();
  const found = schema[tableKey]?.get(name);
  if (!found) {
    throw new HttpError(500, `The Softr ${tableKey} table has no field named "${name}". Update api/_lib/fields.js.`);
  }
  return found;
}

export async function choices(tableKey, name) {
  const found = await field(tableKey, name);
  return (found.options?.choices || []).map((choice) => ({ id: choice.id, label: choice.label }));
}

export async function choiceId(tableKey, name, label) {
  const wanted = String(label).trim().toLowerCase();
  const match = (await choices(tableKey, name)).find((choice) => choice.label.toLowerCase() === wanted);
  if (!match) throw new HttpError(400, `"${label}" is not a valid ${name}.`);
  return match.id;
}

// ---------------------------------------------------------------------------
// Records (responses keyed by field name)

const listCache = new Map();

export async function listRecords(tableKey, { maxAge = 0 } = {}) {
  const cached = listCache.get(tableKey);
  if (maxAge && cached && Date.now() - cached.at < maxAge) return cached.rows;

  const id = tableId(tableKey);
  const rows = [];
  let offset = 0;
  for (;;) {
    const body = await call(`tables/${id}/records?limit=200&offset=${offset}&fieldNames=true`);
    const page = body?.data || [];
    rows.push(...page);
    offset += page.length;
    const total = body?.metadata?.total ?? rows.length;
    if (page.length === 0 || offset >= total) break;
  }
  listCache.set(tableKey, { at: Date.now(), rows });
  return rows;
}

export function assertRecordId(recordId) {
  if (typeof recordId !== 'string' || !/^[A-Za-z0-9]{4,64}$/.test(recordId)) {
    throw new HttpError(400, 'Invalid record id.');
  }
  return recordId;
}

export async function getRecord(tableKey, recordId) {
  assertRecordId(recordId);
  const body = await call(`tables/${tableId(tableKey)}/records/${recordId}?fieldNames=true`);
  return body?.data ?? body;
}

/** Create (recordId = null) or update a record, with values keyed by field name. */
export async function saveRecord(tableKey, recordId, valuesByName) {
  const fields = {};
  for (const [name, value] of Object.entries(valuesByName)) {
    if (value === undefined) continue;
    fields[(await field(tableKey, name)).id] = value;
  }
  const id = tableId(tableKey);
  const path = recordId
    ? `tables/${id}/records/${assertRecordId(recordId)}?fieldNames=true`
    : `tables/${id}/records?fieldNames=true`;
  const body = await call(path, { method: recordId ? 'PATCH' : 'POST', body: { fields } });
  listCache.delete(tableKey);
  return body?.data ?? body;
}

// ---------------------------------------------------------------------------
// Softr does not document the write format for linked-record and attachment
// fields. Each write tries the known shapes in order and remembers the one that
// Softr accepts, so only the first write per server instance pays for a retry.

const acceptedShape = new Map();

export async function writeWithShapes(key, shapes, attempt) {
  const first = acceptedShape.get(key) ?? 0;
  const order = [first, ...shapes.map((_, index) => index).filter((index) => index !== first)];
  let lastError;
  for (const index of order) {
    try {
      const result = await attempt(shapes[index]);
      acceptedShape.set(key, index);
      return result;
    } catch (error) {
      if (!(error instanceof HttpError) || ![400, 422].includes(error.upstream)) throw error;
      lastError = error;
    }
  }
  throw lastError;
}

export function softrFetchFile(path) {
  const { apiKey } = settings();
  return fetch(`${SOFTR_FILE_ORIGIN}${path}`, {
    headers: { 'Softr-Api-Key': apiKey },
    redirect: 'manual',
  });
}
