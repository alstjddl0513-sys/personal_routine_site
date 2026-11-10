CREATE TABLE "question_log_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"question_id" uuid,
	"status" "question_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_log_events" ADD CONSTRAINT "question_log_events_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "question_log_events_owner_created_idx" ON "question_log_events" USING btree ("owner_id","created_at");--> statement-breakpoint
-- auth.users FK (Drizzle은 Supabase auth schema 모름, 0011·0031 패턴).
ALTER TABLE "question_log_events" ADD CONSTRAINT "question_log_events_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
-- RLS: 유저는 본인 기록만 (0028 패턴).
ALTER TABLE "question_log_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "question_log_events_owner_all" ON "question_log_events"
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
-- 기존 기록 옮기기: question_logs 1행마다 마지막으로 표시한 날(updated_at) 이벤트 1개.
INSERT INTO "question_log_events" ("owner_id", "question_id", "status", "created_at")
SELECT "owner_id", "question_id", "status", "updated_at" FROM "question_logs";
--> statement-breakpoint
-- 처음 푼 날(answered_at)이 마지막 표시한 날과 다르면(서울 날짜 기준) 그날 이벤트도 1개 더.
-- 그날 상태는 남아 있지 않아 지금 상태로 넣음(날짜 집계용 — 상태별 통계엔 안 씀).
INSERT INTO "question_log_events" ("owner_id", "question_id", "status", "created_at")
SELECT "owner_id", "question_id", "status", "answered_at" FROM "question_logs"
WHERE ("answered_at" AT TIME ZONE 'Asia/Seoul')::date <> ("updated_at" AT TIME ZONE 'Asia/Seoul')::date;
