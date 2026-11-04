import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';

import { loadHistoryRows } from '@/data/db';
import { toISODate } from './dates';

export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

const KIND: Record<string, string> = { habit: 'Habit', todo: 'To-do', counter: 'Good/Bad habit' };

/** Writes the whole history to a CSV file and opens the share sheet. Resolves to the row count. */
export async function exportHistoryCsv(db: SQLiteDatabase): Promise<number> {
  const data = await loadHistoryRows(db);
  const rows = [
    ['Date', 'Quest', 'Type', 'Result', 'XP', 'Coins'],
    ...data.map((r) => [r.date, r.title, KIND[r.kind] ?? '', r.delta > 0 ? 'Done' : 'Slip', r.xp, r.coins]),
  ];
  const file = new File(Paths.cache, `questie-history-${toISODate(new Date())}.csv`);
  if (file.exists) file.delete();
  file.create();
  // BOM so spreadsheet apps read emoji and non-English titles correctly
  file.write('﻿' + toCsv(rows));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Questie history', UTI: 'public.comma-separated-values-text' });
  }
  return data.length;
}
