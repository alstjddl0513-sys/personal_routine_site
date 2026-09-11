ALTER TABLE "blog_posts" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "blog_sources" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "company_types" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "day_notes" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "routine_checks" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "time_blocks" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "exercises" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_sets" ADD COLUMN "owner_id" uuid;--> statement-breakpoint
-- FKs to auth.users(id). Added manually because Drizzle doesn't know the
-- Supabase auth schema. Cascade on delete so removing a Supabase user
-- cleans up their data across all domain tables in one shot (Phase 12.4b
-- account-deletion relies on this).
ALTER TABLE "blog_posts"        ADD CONSTRAINT "blog_posts_owner_id_auth_users_id_fk"        FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "blog_sources"      ADD CONSTRAINT "blog_sources_owner_id_auth_users_id_fk"      FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "companies"         ADD CONSTRAINT "companies_owner_id_auth_users_id_fk"         FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "company_types"     ADD CONSTRAINT "company_types_owner_id_auth_users_id_fk"     FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "day_notes"         ADD CONSTRAINT "day_notes_owner_id_auth_users_id_fk"         FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "routine_checks"    ADD CONSTRAINT "routine_checks_owner_id_auth_users_id_fk"    FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "time_blocks"       ADD CONSTRAINT "time_blocks_owner_id_auth_users_id_fk"       FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "exercises"         ADD CONSTRAINT "exercises_owner_id_auth_users_id_fk"         FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_sessions"  ADD CONSTRAINT "workout_sessions_owner_id_auth_users_id_fk"  FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "workout_sets"      ADD CONSTRAINT "workout_sets_owner_id_auth_users_id_fk"      FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
