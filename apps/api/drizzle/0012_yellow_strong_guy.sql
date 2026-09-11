ALTER TABLE "blog_posts" DROP CONSTRAINT "blog_posts_url_unique";--> statement-breakpoint
ALTER TABLE "blog_sources" DROP CONSTRAINT "blog_sources_rss_url_unique";--> statement-breakpoint
ALTER TABLE "company_types" DROP CONSTRAINT "company_types_key_unique";--> statement-breakpoint
ALTER TABLE "day_notes" DROP CONSTRAINT "day_notes_date_unique";--> statement-breakpoint
ALTER TABLE "blog_posts" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_sources" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "company_types" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "day_notes" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "routine_checks" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "time_blocks" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "exercises" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sessions" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "workout_sets" ALTER COLUMN "owner_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_owner_url_uq" UNIQUE("owner_id","url");--> statement-breakpoint
ALTER TABLE "blog_sources" ADD CONSTRAINT "blog_sources_owner_rss_url_uq" UNIQUE("owner_id","rss_url");--> statement-breakpoint
ALTER TABLE "company_types" ADD CONSTRAINT "company_types_owner_key_uq" UNIQUE("owner_id","key");--> statement-breakpoint
ALTER TABLE "day_notes" ADD CONSTRAINT "day_notes_owner_date_uq" UNIQUE("owner_id","date");