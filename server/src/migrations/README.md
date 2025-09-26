# Database Migrations

This directory contains SQL migration files for the SQLite database. Migrations are executed in alphabetical order by filename.

## File Naming Convention

Migration files should follow this naming pattern:
```
YYYYMMDD_HHMMSS_description.sql
```

Example:
```
20240926_000000_create_categories_table.sql
```

## Migration File Structure

Each migration file should contain:
- A header comment with migration name and description
- Pure SQL statements
- Use `IF NOT EXISTS` for tables and indexes to ensure idempotency

Example:
```sql
-- Migration: Create users table
-- Description: Creates the users table with basic authentication fields

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
```

## Special Migrations

Some migrations require complex logic that can't be expressed in pure SQL. These are handled programmatically in `migrate.ts`:

- `20240926_000002_migrate_legacy_categories.sql` - Handles legacy data migration

## Creating New Migrations

Use the `createMigrationFile()` function from `migrate.ts`:

```typescript
import { createMigrationFile } from './migrate';

createMigrationFile('add_user_profiles_table');
```

This will create a new migration file with the current timestamp and a template.

## Running Migrations

Migrations are automatically run when the server starts or when ingest scripts are executed. You can also run them manually:

```typescript
import { migrate } from './migrate';
import Database from 'bun:sqlite';

const db = new Database('path/to/db.sqlite');
migrate(db);
```

## Migration Tracking

Applied migrations are tracked in the `migrations` table:
- `id`: Migration identifier (filename without .sql)
- `name`: Human-readable description
- `applied_at`: Timestamp when migration was applied

## Rollback (Limited Support)

For development purposes, you can rollback the last migration:

```typescript
import { rollbackLastMigration } from './migrate';

rollbackLastMigration(db);
```

⚠️ **Warning**: Rollback for SQL-based migrations is limited. It only removes the migration record from tracking - it does not automatically reverse the database schema changes. You may need to manually reverse changes or restore from backup.

## Best Practices

1. **Idempotent**: Use `IF NOT EXISTS` to make migrations safe to run multiple times
2. **Descriptive**: Include clear descriptions in comments
3. **Atomic**: Each migration should be a complete, self-contained change
4. **Tested**: Test migrations on a copy of production data before applying
5. **Versioned**: Never modify existing migration files - create new ones instead
