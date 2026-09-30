CREATE TYPE "public"."feedback_category" AS ENUM('bug', 'suggestion', 'other');--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"category" "feedback_category" NOT NULL,
	"body" text NOT NULL,
	"page" text,
	"version" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_auth_users_fkey"
  FOREIGN KEY ("user_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "feedback" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- 유저는 본인 피드백만 SELECT/INSERT. 편집·삭제 정책 없음 (immutable — UI 없음).
-- 어드민 조회는 NestJS(postgres role)가 RLS bypass. 12.4 defense-in-depth.
CREATE POLICY "feedback_owner_select" ON "feedback" FOR SELECT USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "feedback_owner_insert" ON "feedback" FOR INSERT WITH CHECK (user_id = auth.uid());