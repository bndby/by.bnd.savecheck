import * as SQLite from "expo-sqlite";
import { Ledger, createLedger } from "./ledger";

type CategoryRow = { name: string };
type ReceiptRow = { id: number; date: string; shot: string | null };
type LineRow = {
  receipt_id: number;
  name: string;
  amount_cents: number;
  category: string;
};

const database = SQLite.openDatabaseAsync("savecheck.db");

async function databaseReady(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS category (
      position INTEGER PRIMARY KEY NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS receipt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      shot TEXT
    );
    CREATE TABLE IF NOT EXISTS line (
      receipt_id INTEGER NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      category TEXT NOT NULL,
      PRIMARY KEY (receipt_id, position),
      FOREIGN KEY (receipt_id) REFERENCES receipt(id) ON DELETE CASCADE
    );
  `);
  const columns = await db.getAllAsync<{ name: string }>("PRAGMA table_info(receipt)");
  if (!columns.some((column) => column.name === "shot")) {
    await db.execAsync("ALTER TABLE receipt ADD COLUMN shot TEXT");
  }
}

function cents(amount: number): number {
  return Math.round(amount * 100);
}

async function writeLedger(ledger: Ledger): Promise<void> {
  const db = await database;
  await databaseReady(db);
  await db.withTransactionAsync(async () => {
    await db.execAsync("DELETE FROM line; DELETE FROM receipt; DELETE FROM category;");
    for (const [position, name] of ledger.categories.entries()) {
      await db.runAsync("INSERT INTO category (position, name) VALUES (?, ?)", position, name);
    }
    for (const receipt of ledger.receipts) {
      const inserted = await db.runAsync(
        "INSERT INTO receipt (date, shot) VALUES (?, ?)",
        receipt.date,
        receipt.shot,
      );
      for (const [position, line] of receipt.lines.entries()) {
        await db.runAsync(
          "INSERT INTO line (receipt_id, position, name, amount_cents, category) VALUES (?, ?, ?, ?, ?)",
          inserted.lastInsertRowId,
          position,
          line.name,
          cents(line.amount),
          line.category,
        );
      }
    }
  });
}

let tail: Promise<void> = Promise.resolve();

export function saveLedger(ledger: Ledger): Promise<void> {
  const job = tail.then(() => writeLedger(ledger));
  tail = job.then(
    () => undefined,
    () => undefined,
  );
  return job;
}

export async function loadLedger(): Promise<Ledger> {
  const db = await database;
  await databaseReady(db);
  const categories = await db.getAllAsync<CategoryRow>(
    "SELECT name FROM category ORDER BY position",
  );
  if (categories.length === 0) {
    const ledger = createLedger();
    await saveLedger(ledger);
    return ledger;
  }
  const receipts = await db.getAllAsync<ReceiptRow>(
    "SELECT id, date, shot FROM receipt ORDER BY id",
  );
  const lines = await db.getAllAsync<LineRow>(
    "SELECT receipt_id, name, amount_cents, category FROM line ORDER BY receipt_id, position",
  );
  return {
    categories: categories.map((row) => row.name),
    receipts: receipts.map((receipt) => ({
      date: receipt.date,
      shot: receipt.shot,
      lines: lines
        .filter((line) => line.receipt_id === receipt.id)
        .map((line) => ({
          name: line.name,
          amount: line.amount_cents / 100,
          category: line.category,
        })),
    })),
  };
}
