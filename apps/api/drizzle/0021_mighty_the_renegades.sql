CREATE TYPE "public"."document_kind" AS ENUM('resume', 'portfolio', 'link');--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"kind" "document_kind" NOT NULL,
	"title" text NOT NULL,
	"storage_path" text,
	"url" text,
	"file_size" integer,
	"file_mime" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_owner_id_auth_users_fkey"
  FOREIGN KEY ("owner_id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint
CREATE UNIQUE INDEX "documents_one_active_per_kind"
  ON "documents" ("owner_id", "kind") WHERE "is_active" = true;
--> statement-breakpoint
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "documents_owner_select" ON "documents" FOR SELECT USING (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "documents_owner_insert" ON "documents" FOR INSERT WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "documents_owner_update" ON "documents" FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "documents_owner_delete" ON "documents" FOR DELETE USING (owner_id = auth.uid());
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
CREATE POLICY "documents_storage_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
--> statement-breakpoint
CREATE POLICY "documents_storage_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
--> statement-breakpoint
CREATE POLICY "documents_storage_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
--> statement-breakpoint
CREATE POLICY "documents_storage_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
