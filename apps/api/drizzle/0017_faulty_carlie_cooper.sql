CREATE TABLE "question_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "question_categories_owner_key_uq" UNIQUE("owner_id","key")
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "category_key" text;--> statement-breakpoint
ALTER TABLE "question_categories" ADD CONSTRAINT "question_categories_owner_id_auth_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "question_categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "question_categories_owner_select" ON "question_categories" FOR SELECT USING (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "question_categories_owner_insert" ON "question_categories" FOR INSERT WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "question_categories_owner_update" ON "question_categories" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());--> statement-breakpoint
CREATE POLICY "question_categories_owner_delete" ON "question_categories" FOR DELETE USING (owner_id = auth.uid());