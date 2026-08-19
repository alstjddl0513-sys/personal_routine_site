CREATE TYPE "public"."application_status" AS ENUM('not_applied', 'applied', 'document_passed', 'document_failed', 'interview_1_passed', 'interview_1_failed', 'interview_2_passed', 'interview_2_failed', 'final_passed', 'final_failed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."company_type_1" AS ENUM('big_tech', 'sme', 'startup', 'foreign', 'public');--> statement-breakpoint
CREATE TYPE "public"."company_type_2" AS ENUM('service', 'solution', 'si', 'inhouse', 'lab', 'freelance');--> statement-breakpoint
CREATE TYPE "public"."employment_type" AS ENUM('intern_to_regular', 'full_time', 'contract', 'etc');--> statement-breakpoint
CREATE TYPE "public"."priority" AS ENUM('important', 'normal', 'urgent');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type1" "company_type_1" NOT NULL,
	"type2" "company_type_2" NOT NULL,
	"priority" "priority" DEFAULT 'normal' NOT NULL,
	"is_hiring" boolean DEFAULT false NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"note" text,
	"posting_url" text,
	"employment_type" "employment_type",
	"application_deadline" date,
	"application_status" "application_status" DEFAULT 'not_applied' NOT NULL,
	"applied_at" date,
	"application_doc_url" text,
	"progress_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
