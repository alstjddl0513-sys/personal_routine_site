-- Phase 12.4 commit E: enable RLS + owner_id=auth.uid() policies on every
-- domain table + profiles. NestJS talks to Postgres as the `postgres`
-- superuser which bypasses RLS (so app queries are unaffected), but if the
-- publishable/anon key ever hits the DB directly through the Supabase
-- client, these policies are the final gate. Defense-in-depth.
--
-- Each table gets four policies (select / insert / update / delete). The
-- update policy uses both USING (which rows are visible for updating) and
-- WITH CHECK (what the row looks like after update) with the same predicate
-- so a user can't move a row to another owner.
--
-- profiles uses `id` (== auth.users(id)) as the ownership key; everything
-- else uses the `owner_id` column added in migration 0011.

ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "profiles_owner_select" ON "profiles" FOR SELECT USING (id = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_owner_insert" ON "profiles" FOR INSERT WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_owner_update" ON "profiles" FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());--> statement-breakpoint
CREATE POLICY "profiles_owner_delete" ON "profiles" FOR DELETE USING (id = auth.uid());--> statement-breakpoint

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "companies_owner_select" ON "companies" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "companies_owner_insert" ON "companies" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "companies_owner_update" ON "companies" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "companies_owner_delete" ON "companies" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "company_types" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "company_types_owner_select" ON "company_types" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "company_types_owner_insert" ON "company_types" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "company_types_owner_update" ON "company_types" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "company_types_owner_delete" ON "company_types" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "time_blocks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "time_blocks_owner_select" ON "time_blocks" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "time_blocks_owner_insert" ON "time_blocks" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "time_blocks_owner_update" ON "time_blocks" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "time_blocks_owner_delete" ON "time_blocks" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "routine_checks" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "routine_checks_owner_select" ON "routine_checks" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "routine_checks_owner_insert" ON "routine_checks" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "routine_checks_owner_update" ON "routine_checks" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "routine_checks_owner_delete" ON "routine_checks" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "day_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "day_notes_owner_select" ON "day_notes" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "day_notes_owner_insert" ON "day_notes" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "day_notes_owner_update" ON "day_notes" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "day_notes_owner_delete" ON "day_notes" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "exercises" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "exercises_owner_select" ON "exercises" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "exercises_owner_insert" ON "exercises" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "exercises_owner_update" ON "exercises" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "exercises_owner_delete" ON "exercises" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "workout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workout_sessions_owner_select" ON "workout_sessions" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sessions_owner_insert" ON "workout_sessions" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sessions_owner_update" ON "workout_sessions" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sessions_owner_delete" ON "workout_sessions" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "workout_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "workout_sets_owner_select" ON "workout_sets" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sets_owner_insert" ON "workout_sets" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sets_owner_update" ON "workout_sets" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "workout_sets_owner_delete" ON "workout_sets" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "blog_sources" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_sources_owner_select" ON "blog_sources" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_sources_owner_insert" ON "blog_sources" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_sources_owner_update" ON "blog_sources" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_sources_owner_delete" ON "blog_sources" FOR DELETE USING (owner_id = auth.uid());--> statement-breakpoint

ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "blog_posts_owner_select" ON "blog_posts" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_posts_owner_insert" ON "blog_posts" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_posts_owner_update" ON "blog_posts" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "blog_posts_owner_delete" ON "blog_posts" FOR DELETE USING (owner_id = auth.uid());
