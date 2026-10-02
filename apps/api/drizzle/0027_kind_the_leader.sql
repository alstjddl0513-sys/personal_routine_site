CREATE TYPE "public"."company_event_type" AS ENUM('deadline', 'test', 'interview', 'announcement', 'other');--> statement-breakpoint
CREATE TABLE "company_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"date" date NOT NULL,
	"type" "company_event_type" NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduler_memos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"date" date NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "scheduler_memos_owner_date_uq" UNIQUE("owner_id","date")
);
--> statement-breakpoint
ALTER TABLE "company_events" ADD CONSTRAINT "company_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_events_owner_date_idx" ON "company_events" USING btree ("owner_id","date");--> statement-breakpoint
CREATE INDEX "company_events_company_idx" ON "company_events" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "scheduler_memos_owner_date_idx" ON "scheduler_memos" USING btree ("owner_id","date");
--> statement-breakpoint
-- Drizzle은 Supabase auth schema를 모르므로 auth.users FK는 raw SQL로 (0011 패턴).
ALTER TABLE "company_events" ADD CONSTRAINT "company_events_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "scheduler_memos" ADD CONSTRAINT "scheduler_memos_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
-- RLS: 유저는 본인 데이터만 전면 CRUD. defense-in-depth (NestJS가 owner 필터 1차, DB가 2차).
ALTER TABLE "company_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "company_events_owner_all" ON "company_events"
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
ALTER TABLE "scheduler_memos" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "scheduler_memos_owner_all" ON "scheduler_memos"
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());