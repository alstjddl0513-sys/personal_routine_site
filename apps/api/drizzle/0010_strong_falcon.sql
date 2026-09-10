CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_nickname_unique" UNIQUE("nickname")
);
--> statement-breakpoint
-- FK to auth.users(id). Added manually because Drizzle doesn't know the
-- Supabase auth schema. Cascade on delete so removing a Supabase user
-- cleans up the profile automatically.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_auth_users_id_fk"
	FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
