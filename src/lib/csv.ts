import { File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';
import * as Sharing from 'expo-sharing';

import { loadHistoryRows } from '@/data/db';

export function toCsv(rows: (string | number | null)[][]): string {
  const cell = (v: string | number | null) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

const KIND: Record<string, string> = { habit: 'Habit', todo: 'To-do' };

/**
 * Writes the history between two days (both included) to a CSV file and opens the share sheet.
 * Resolves to the row count; nothing is shared when there are no rows.
 */
export async function exportHistoryCsv(db: SQLiteDatabase, from: string, to: string): Promise<number> {
  const data = await loadHistoryRows(db, from, to);
  if (!data.length) return 0;
  const rows = [
    ['Date', 'Quest', 'Type', 'Result', 'XP', 'Coins'],
    ...data.map((r) => [r.date, r.title, KIND[r.kind] ?? '', r.delta > 0 ? 'Done' : 'Slip', r.xp, r.coins]),
  ];
  const file = new File(Paths.cache, `questie-history-${from}-to-${to}.csv`);
  if (file.exists) file.delete();
  file.create();
  // BOM so spreadsheet apps read emoji and non-English titles correctly
  file.write('﻿' + toCsv(rows));
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export Questie history', UTI: 'public.comma-separated-values-text' });
  }
  return data.length;
}
