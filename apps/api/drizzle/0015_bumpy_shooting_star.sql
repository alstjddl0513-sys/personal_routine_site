CREATE TABLE "muscle_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"muscle_key" text NOT NULL,
	"weekly_set_target" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "muscle_goals_owner_muscle_uq" UNIQUE("owner_id","muscle_key")
);
--> statement-breakpoint
ALTER TABLE "muscle_goals" ADD CONSTRAINT "muscle_goals_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "muscle_goals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "muscle_goals_owner_select" ON "muscle_goals" FOR SELECT USING (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "muscle_goals_owner_insert" ON "muscle_goals" FOR INSERT WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "muscle_goals_owner_update" ON "muscle_goals" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "muscle_goals_owner_delete" ON "muscle_goals" FOR DELETE USING (owner_id = auth.uid());
