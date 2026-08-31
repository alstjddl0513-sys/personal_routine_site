CREATE TABLE "company_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "company_types_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "companies" ALTER COLUMN "type2" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."company_type_2";--> statement-breakpoint
INSERT INTO "company_types" ("key", "label", "sort_order", "is_default") VALUES
  ('service',   '서비스',   0, true),
  ('solution',  '솔루션',   1, true),
  ('si',        'SI',       2, true),
  ('inhouse',   '인하우스', 3, true),
  ('lab',       '랩',       4, true),
  ('freelance', '프리랜서', 5, true);