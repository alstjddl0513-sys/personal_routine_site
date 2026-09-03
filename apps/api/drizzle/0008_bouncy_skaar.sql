CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text NOT NULL,
	"summary" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "blog_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"rss_url" text NOT NULL,
	"site_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blog_sources_rss_url_unique" UNIQUE("rss_url")
);
--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_source_id_blog_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."blog_sources"("id") ON DELETE cascade ON UPDATE no action;