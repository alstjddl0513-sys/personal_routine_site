CREATE TYPE "public"."announcement_kind" AS ENUM('notice', 'update', 'maintenance', 'event');--> statement-breakpoint
CREATE TABLE "announcement_reads" (
	"user_id" uuid NOT NULL,
	"announcement_id" uuid NOT NULL,
	"read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcement_reads_user_id_announcement_id_pk" PRIMARY KEY("user_id","announcement_id")
);
--> statement-breakpoint
CREATE TABLE "announcement_targets" (
	"announcement_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	CONSTRAINT "announcement_targets_announcement_id_user_id_pk" PRIMARY KEY("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "announcement_kind" DEFAULT 'notice' NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "announcement_reads_user_idx" ON "announcement_reads" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcement_targets_user_idx" ON "announcement_targets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "announcements_active_window_idx" ON "announcements" USING btree ("is_active","starts_at","ends_at","created_at");--> statement-breakpoint
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_user_id_auth_users_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "announcement_targets" ADD CONSTRAINT "announcement_targets_user_id_auth_users_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- 활성 + 기간 매치 공지만 authenticated에게 SELECT.
-- INSERT/UPDATE/DELETE 정책 없음 → NestJS(postgres role)만 관리. 12.4 defense-in-depth.
CREATE POLICY "announcements_active_window_select" ON "announcements" FOR SELECT USING (
  is_active = true
  AND (starts_at IS NULL OR starts_at <= now())
  AND (ends_at IS NULL OR ends_at > now())
);
--> statement-breakpoint
-- 타겟은 SELECT 정책도 없음 → authenticated 접근 불가.
-- 서비스 레이어(postgres role)만 조회. 개인정보(누구에게 보냈나) 누출 방지.
ALTER TABLE "announcement_targets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "announcement_reads" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "announcement_reads_owner_select" ON "announcement_reads" FOR SELECT USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "announcement_reads_owner_insert" ON "announcement_reads" FOR INSERT WITH CHECK (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "announcement_reads_owner_delete" ON "announcement_reads" FOR DELETE USING (user_id = auth.uid());