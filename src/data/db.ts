import type { SQLiteDatabase } from 'expo-sqlite';

import type { Completion, Item, Profile } from './types';

export const DB_NAME = 'questie.db';

/** Fields added after the first release, with the values older profiles should start from */
export const PROFILE_DEFAULTS: Pick<
  Profile,
  'inventory' | 'fed_on' | 'owned' | 'pet_accessory' | 'hair' | 'hair_color' | 'skin' | 'outfit'
> = {
  inventory: {},
  fed_on: null,
  owned: [],
  pet_accessory: null,
  hair: 'crop',
  hair_color: 'brown',
  skin: 1,
  outfit: 'bomber',
};

// Each entry upgrades the schema by one version; never edit a shipped migration, append a new one.
const MIGRATIONS = [
  `
  CREATE TABLE items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    days TEXT NOT NULL DEFAULT '',
    due TEXT,
    done_on TEXT,
    sort INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE completions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    delta INTEGER NOT NULL,
    xp INTEGER NOT NULL,
    coins INTEGER NOT NULL
  );
  CREATE INDEX completions_date ON completions(date);
  CREATE TABLE profile (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL);
  `,
  `
  ALTER TABLE items ADD COLUMN target INTEGER NOT NULL DEFAULT 1;
  ALTER TABLE items ADD COLUMN due_time TEXT;
  ALTER TABLE items ADD COLUMN notif_id TEXT;
  `,
];

/** Runs on open (SQLiteProvider onInit): brings the schema up to date. */
export async function migrate(db: SQLiteDatabase) {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const from = row?.user_version ?? 0;
  for (let v = from; v < MIGRATIONS.length; v++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[v]);
      await db.execAsync(`PRAGMA user_version = ${v + 1}`);
    });
  }
}

type ItemRow = Omit<Item, 'days'> & { days: string };

const toItem = (r: ItemRow): Item => ({ ...r, days: r.days ? r.days.split(',').map(Number) : [] });

export async function loadItems(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<ItemRow>('SELECT * FROM items ORDER BY sort, id');
  return rows.map(toItem);
}

export function loadCompletions(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Completion>('SELECT * FROM completions WHERE date = ?', date);
}

export async function loadProfile(db: SQLiteDatabase): Promise<Profile | null> {
  const row = await db.getFirstAsync<{ data: string }>('SELECT data FROM profile WHERE id = 1');
  // Profiles saved by older versions lack newer fields, so fill in their defaults
  return row ? { ...PROFILE_DEFAULTS, ...(JSON.parse(row.data) as Profile) } : null;
}

export async function saveProfile(db: SQLiteDatabase, p: Profile) {
  await db.runAsync('INSERT OR REPLACE INTO profile (id, data) VALUES (1, ?)', JSON.stringify(p));
}

export type ItemDraft = Omit<Item, 'id' | 'sort' | 'done_on' | 'notif_id'> & { id?: number };

/** Inserts or updates an item and returns its id. */
export async function saveItem(db: SQLiteDatabase, d: ItemDraft) {
  const days = d.days.join(',');
  if (d.id != null) {
    await db.runAsync(
      'UPDATE items SET kind = ?, title = ?, difficulty = ?, days = ?, target = ?, due = ?, due_time = ? WHERE id = ?',
      d.kind, d.title, d.difficulty, days, d.target, d.due, d.due_time, d.id,
    );
    return d.id;
  }
  const res = await db.runAsync(
    'INSERT INTO items (kind, title, difficulty, days, target, due, due_time, sort) VALUES (?, ?, ?, ?, ?, ?, ?, (SELECT COALESCE(MAX(sort), 0) + 1 FROM items))',
    d.kind, d.title, d.difficulty, days, d.target, d.due, d.due_time,
  );
  return res.lastInsertRowId;
}

export async function setNotifId(db: SQLiteDatabase, id: number, notifId: string | null) {
  await db.runAsync('UPDATE items SET notif_id = ? WHERE id = ?', notifId, id);
}

export async function deleteItem(db: SQLiteDatabase, id: number) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM completions WHERE item_id = ?', id);
    await db.runAsync('DELETE FROM items WHERE id = ?', id);
  });
}

export async function setTodoDone(db: SQLiteDatabase, id: number, doneOn: string | null) {
  await db.runAsync('UPDATE items SET done_on = ? WHERE id = ?', doneOn, id);
}

export async function addCompletion(db: SQLiteDatabase, c: Omit<Completion, 'id'>): Promise<Completion> {
  const res = await db.runAsync(
    'INSERT INTO completions (item_id, date, delta, xp, coins) VALUES (?, ?, ?, ?, ?)',
    c.item_id, c.date, c.delta, c.xp, c.coins,
  );
  return { ...c, id: res.lastInsertRowId };
}

export async function removeCompletion(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM completions WHERE id = ?', id);
}

export async function resetAll(db: SQLiteDatabase) {
  await db.execAsync('DELETE FROM completions; DELETE FROM items; DELETE FROM profile;');
}

/** Totals per day for the last `days` days, oldest first — for the weekly chart. */
export function loadDailyTotals(db: SQLiteDatabase, since: string) {
  return db.getAllAsync<{ date: string; done: number; xp: number }>(
    'SELECT date, SUM(CASE WHEN delta > 0 THEN 1 ELSE 0 END) AS done, SUM(xp) AS xp FROM completions WHERE date >= ? GROUP BY date ORDER BY date',
    since,
  );
}
