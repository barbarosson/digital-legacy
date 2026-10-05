import Database from "better-sqlite3";
import { scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";

function verify(pin, stored) {
  const [salt, expected] = stored.split(":");
  const actual = scryptSync(pin, salt, 64, { N: 16384, r: 8, p: 1 }).toString(
    "hex",
  );
  try {
    return timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(actual, "hex"),
    );
  } catch {
    return false;
  }
}

const candidates = [
  "data/dijital-miras.db",
  "data-demo-screenshots/dijital-miras.db",
];

for (const p of candidates) {
  if (!fs.existsSync(p)) {
    console.log(p, "MISSING");
    continue;
  }
  const db = new Database(p, { readonly: true });
  const row = db
    .prepare("select value from app_settings where key = ?")
    .get("pin_hash");
  console.log(p, "pin_hash?", Boolean(row?.value));
  if (row?.value) {
    for (const pin of ["123456", "1234", "0000", "1111"]) {
      console.log(" ", pin, verify(pin, row.value));
    }
  }
  db.close();
}
