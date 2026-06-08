-- Migrate custom auth tables to better-auth schema
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "image" text;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"id_token" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_user_id" ON "sessions" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_sessions_expires_at" ON "sessions" USING btree ("expires_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_accounts_user_id" ON "accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_accounts_provider_account" ON "accounts" USING btree ("provider_id","account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_verifications_identifier" ON "verifications" USING btree ("identifier");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");
--> statement-breakpoint
-- Migrate active sessions (preserve cookie tokens)
INSERT INTO "sessions" ("id", "user_id", "token", "expires_at", "created_at", "updated_at")
SELECT
	"id",
	"user_id",
	"id",
	"expires_at",
	"created_at",
	COALESCE("created_at", now())
FROM "user_sessions"
WHERE "expires_at" > now()
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
-- Migrate Google OAuth links
INSERT INTO "accounts" ("id", "user_id", "account_id", "provider_id", "created_at", "updated_at")
SELECT
	gen_random_uuid()::text,
	"user_id",
	"google_id",
	'google',
	"created_at",
	"created_at"
FROM "google_accounts"
ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Migrate email/password credentials
INSERT INTO "accounts" ("id", "user_id", "account_id", "provider_id", "password", "created_at", "updated_at")
SELECT
	gen_random_uuid()::text,
	"id",
	"id"::text,
	'credential',
	"password_hash",
	"created_at",
	"updated_at"
FROM "users"
WHERE "password_hash" IS NOT NULL AND "password_hash" <> ''
  AND NOT EXISTS (
    SELECT 1 FROM "accounts" a
    WHERE a."user_id" = "users"."id" AND a."provider_id" = 'credential'
  );
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
--> statement-breakpoint
DROP TABLE IF EXISTS "auth_tokens";
--> statement-breakpoint
DROP TABLE IF EXISTS "google_accounts";
--> statement-breakpoint
DROP TABLE IF EXISTS "user_sessions";
