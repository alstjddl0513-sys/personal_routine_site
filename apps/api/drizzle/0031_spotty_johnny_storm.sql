CREATE TABLE "workout_split_exercises" (
	"split_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	CONSTRAINT "workout_split_exercises_split_id_exercise_id_pk" PRIMARY KEY("split_id","exercise_id")
);
--> statement-breakpoint
CREATE TABLE "workout_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD COLUMN "split_id" uuid;--> statement-breakpoint
ALTER TABLE "workout_split_exercises" ADD CONSTRAINT "workout_split_exercises_split_id_workout_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."workout_splits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_split_exercises" ADD CONSTRAINT "workout_split_exercises_exercise_id_exercises_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "wse_exercise_idx" ON "workout_split_exercises" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "workout_splits_owner_order_idx" ON "workout_splits" USING btree ("owner_id","sort_order");--> statement-breakpoint
ALTER TABLE "workout_sessions" ADD CONSTRAINT "workout_sessions_split_id_workout_splits_id_fk" FOREIGN KEY ("split_id") REFERENCES "public"."workout_splits"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- auth.users FK (Drizzle은 Supabase auth schema 모름, 0011 패턴).
ALTER TABLE "workout_splits" ADD CONSTRAINT "workout_splits_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
-- RLS: 유저는 본인 분할만 CRUD. junction은 소속 분할이 유저 소유일 때만 (0028 패턴).
ALTER TABLE "workout_splits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workout_splits_owner_all" ON "workout_splits"
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
ALTER TABLE "workout_split_exercises" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "workout_split_exercises_owner_all" ON "workout_split_exercises"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_splits ws
      WHERE ws.id = workout_split_exercises.split_id
        AND ws.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_splits ws
      WHERE ws.id = workout_split_exercises.split_id
        AND ws.owner_id = auth.uid()
    )
  );
