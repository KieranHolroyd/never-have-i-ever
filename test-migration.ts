import Database from "bun:sqlite";
import { migrate, getMigrationStatus } from "./server/src/migrate";

console.log("Testing migration system...");

// Test on in-memory database
const db = new Database(":memory:");
migrate(db);

console.log("\nMigration status:");
const status = getMigrationStatus(db);
console.log(status);

db.close();
console.log("Migration test completed!");
