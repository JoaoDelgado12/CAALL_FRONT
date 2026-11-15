import Dexie, { type Table } from 'dexie';

export interface DictionaryRecord {
  id: string; // e.g., 'user_dictionary'
  usuarioId: number;
  wordsMap: Record<string, string[]>; // Serialized representation of mapWord
  timestampDictionary: number; // Epoch timestamp matching backend
  isDirty: boolean; // True if modified offline and awaiting upload
}

export interface AuthSessionRecord {
  id: string; // 'active_session'
  usuarioId: number;
  usuario: string;
  token: string;
  fcmToken?: string;
}

class CaallDatabase extends Dexie {
  dictionary!: Table<DictionaryRecord, string>;
  session!: Table<AuthSessionRecord, string>;

  constructor() {
    super('CaallOfflineDB');
    this.version(1).stores({
      dictionary: 'id, usuarioId, timestampDictionary, isDirty',
      session: 'id, usuarioId',
    });
  }
}

export const db = new CaallDatabase();

/**
 * Saves local edits to IndexedDB and tags the record with a new timestamp and dirty flag (BR2, BR3).
 */
export async function saveLocalDictionaryEdit(
  usuarioId: number,
  updatedMap: Map<string, string[]>
): Promise<void> {
  const plainObject = Object.fromEntries(updatedMap);
  await db.dictionary.put({
    id: 'user_dictionary',
    usuarioId,
    wordsMap: plainObject,
    timestampDictionary: Date.now(),
    isDirty: true,
  });
}

/**
 * Loads the dictionary from IndexedDB on startup. Falls back to default seed if empty.
 */
export async function loadLocalDictionary(
  defaultMap: Map<string, string[]>
): Promise<Map<string, string[]>> {
  const record = await db.dictionary.get('user_dictionary');
  if (record?.wordsMap) {
    return new Map(Object.entries(record.wordsMap));
  }
  return defaultMap;
}

type DictMap = Record<string, string[]>;

const MAX_DICT_CHARS = 1500; // VARCHAR(1500)
let inFlight: Promise<Map<string, string[]> | null> | null = null;

function toMillis(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const ms = typeof value === 'number' ? value : Date.parse(value);
  return Number.isNaN(ms) ? 0 : ms;
}

/** Returns the new Map only when the server version replaced the local one; otherwise null. */
export function synchronizeDictionary(apiBaseUrl: string) {
  inFlight ??= doSync(apiBaseUrl).finally(() => { inFlight = null; });
  return inFlight;
}

async function doSync(apiBaseUrl: string): Promise<Map<string, string[]> | null> {
  if (!navigator.onLine) return null;
  const session = await db.session.get('active_session');
  if (!session) return null;

  const url = `${apiBaseUrl}/api/dados-pessoais/${session.usuarioId}/dictionary`;
  const headers = {
    Authorization: `Bearer ${session.token}`,
    'Content-Type': 'application/json',
  };
  const localRecord = await db.dictionary.get('user_dictionary');
  const localTs = localRecord?.timestampDictionary ?? 0;

  try {
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
    if (res.status === 401) return null; // TODO: trigger re-authentication
    if (!res.ok && res.status !== 404) return null;

    const server = res.ok
      ? ((await res.json()) as { ditionary?: string; timestamp_dictionary?: string | number | null })
      : null;
    const serverTs = toMillis(server?.timestamp_dictionary);

    // Server newer -> overwrite local
    if (server?.ditionary && serverTs > localTs) {
      const parsed = JSON.parse(server.ditionary) as DictMap;
      await db.dictionary.put({
        id: 'user_dictionary',
        usuarioId: session.usuarioId,
        wordsMap: parsed,
        timestampDictionary: serverTs,
        isDirty: false,
      });
      return new Map(Object.entries(parsed));
    }

    // Local newer and dirty (or server has nothing yet) -> push
    if (localRecord?.isDirty && localTs > serverTs) {
      const dictionary = JSON.stringify(localRecord.wordsMap);
      if (dictionary.length > MAX_DICT_CHARS) {
        console.error('Dictionary exceeds server column size; not syncing.');
        return null;
      }
      const push = await fetch(url, {
        method: 'PUT',
        headers,
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          ditionary: dictionary,
          timestamp_dictionary: new Date(localTs).toISOString(),
        }),
      });
      if (push.ok) {
        // Only clear the flag if nothing changed while the request was in flight
        await db.dictionary
          .where('id').equals('user_dictionary')
          .and(r => r.timestampDictionary === localTs)
          .modify({ isDirty: false });
      }
    }
  } catch (error) {
    console.warn('Dictionary sync failed:', error);
  }
  return null;
}