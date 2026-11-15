ALTER TABLE "question_log_events" DROP CONSTRAINT "question_log_events_question_id_questions_id_fk";
--> statement-breakpoint
ALTER TABLE "question_log_events" ALTER COLUMN "question_id" SET NOT NULL;