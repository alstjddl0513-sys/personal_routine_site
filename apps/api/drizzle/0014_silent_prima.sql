CREATE TYPE "public"."question_status" AS ENUM('understood', 'review_needed');--> statement-breakpoint
CREATE TABLE "question_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"status" "question_status" NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_logs_owner_question_uq" UNIQUE("owner_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"content" text NOT NULL,
	"answer" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "question_logs" ADD CONSTRAINT "question_logs_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "questions" ADD CONSTRAINT "questions_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "question_logs" ADD CONSTRAINT "question_logs_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "questions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "questions_owner_select" ON "questions" FOR SELECT USING (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "questions_owner_insert" ON "questions" FOR INSERT WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "questions_owner_update" ON "questions" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "questions_owner_delete" ON "questions" FOR DELETE USING (owner_id = auth.uid());
--> statement-breakpoint
ALTER TABLE "question_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "question_logs_owner_select" ON "question_logs" FOR SELECT USING (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "question_logs_owner_insert" ON "question_logs" FOR INSERT WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "question_logs_owner_update" ON "question_logs" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "question_logs_owner_delete" ON "question_logs" FOR DELETE USING (owner_id = auth.uid());