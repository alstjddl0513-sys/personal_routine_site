CREATE TYPE "public"."routine_challenge_status" AS ENUM('active', 'completed', 'abandoned');--> statement-breakpoint
CREATE TABLE "routine_challenge_blocks" (
	"challenge_id" uuid NOT NULL,
	"block_id" uuid NOT NULL,
	CONSTRAINT "routine_challenge_blocks_challenge_id_block_id_pk" PRIMARY KEY("challenge_id","block_id")
);
--> statement-breakpoint
CREATE TABLE "routine_challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" text NOT NULL,
	"start_date" date NOT NULL,
	"target_days" integer NOT NULL,
	"status" "routine_challenge_status" DEFAULT 'active' NOT NULL,
	"completed_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "routine_challenge_blocks" ADD CONSTRAINT "routine_challenge_blocks_challenge_id_routine_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."routine_challenges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_challenge_blocks" ADD CONSTRAINT "routine_challenge_blocks_block_id_time_blocks_id_fk" FOREIGN KEY ("block_id") REFERENCES "public"."time_blocks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rcb_block_idx" ON "routine_challenge_blocks" USING btree ("block_id");
--> statement-breakpoint
-- 조회 성능 (owner별 상태별 필터) 커버.
CREATE INDEX "routine_challenges_owner_status_idx" ON "routine_challenges" USING btree ("owner_id","status");
--> statement-breakpoint
-- auth.users FK (Drizzle은 Supabase auth schema 모름, 0011 패턴).
ALTER TABLE "routine_challenges" ADD CONSTRAINT "routine_challenges_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
-- RLS: 유저는 본인 챌린지만 CRUD. junction 테이블은 challenge FK로 간접 보호.
ALTER TABLE "routine_challenges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "routine_challenges_owner_all" ON "routine_challenges"
  FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
ALTER TABLE "routine_challenge_blocks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
-- junction은 소속 챌린지가 유저 소유인 경우에만 접근 가능.
CREATE POLICY "routine_challenge_blocks_owner_all" ON "routine_challenge_blocks"
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM routine_challenges rc
      WHERE rc.id = routine_challenge_blocks.challenge_id
        AND rc.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routine_challenges rc
      WHERE rc.id = routine_challenge_blocks.challenge_id
        AND rc.owner_id = auth.uid()
    )
  );