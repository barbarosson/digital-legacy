import Database from "better-sqlite3";

const db = new Database("data/dijital-miras.db");
console.log(
  "tables:",
  db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all(),
);
try {
  console.log(
    "migrations:",
    db.prepare("SELECT * FROM __drizzle_migrations").all(),
  );
} catch {
  console.log("no __drizzle_migrations table");
}
