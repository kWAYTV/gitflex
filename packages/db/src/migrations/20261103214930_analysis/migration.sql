CREATE TYPE "repository_scan_status" AS ENUM('queued', 'running', 'completed', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "scan_status" AS ENUM('queued', 'running', 'completed', 'partial', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "scan_trigger" AS ENUM('initial', 'manual', 'scheduled', 'webhook');--> statement-breakpoint
CREATE TABLE "language" (
	"color" text,
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_dependency" (
	"constraint" text,
	"direct" boolean NOT NULL,
	"ecosystem" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"manifest_path" text NOT NULL,
	"name" text NOT NULL,
	"repository_id" uuid NOT NULL,
	"repository_scan_id" uuid NOT NULL,
	"scope" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_language" (
	"bytes" bigint NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"language_id" text NOT NULL,
	"percentage" real NOT NULL,
	"repository_id" uuid NOT NULL,
	"repository_scan_id" uuid NOT NULL,
	"role" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_scan" (
	"analyzer_version" text NOT NULL,
	"commit_sha" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"error_code" text,
	"error_message" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"registry_version" text NOT NULL,
	"repository_id" uuid NOT NULL,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"scan_id" uuid NOT NULL,
	"started_at" timestamp with time zone,
	"status" "repository_scan_status" DEFAULT 'queued'::"repository_scan_status" NOT NULL,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "repository_technology" (
	"confidence" real NOT NULL,
	"detected_at" timestamp with time zone NOT NULL,
	"evidence_count" integer NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"repository_id" uuid NOT NULL,
	"repository_scan_id" uuid NOT NULL,
	"technology_id" text NOT NULL,
	"usage_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan" (
	"completed_at" timestamp with time zone,
	"completed_repositories" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_stage" text,
	"error_summary" text,
	"failed_repositories" integer DEFAULT 0 NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"skipped_repositories" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone,
	"status" "scan_status" DEFAULT 'queued'::"scan_status" NOT NULL,
	"total_repositories" integer DEFAULT 0 NOT NULL,
	"trigger_type" "scan_trigger" NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology" (
	"category" text NOT NULL,
	"description" text NOT NULL,
	"id" text PRIMARY KEY,
	"metadata" jsonb NOT NULL,
	"name" text NOT NULL,
	"registry_version" text NOT NULL,
	"subcategory" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technology_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"kind" text NOT NULL,
	"repository_technology_id" uuid NOT NULL,
	"rule" text NOT NULL,
	"source" text NOT NULL,
	"weight" real NOT NULL
);
--> statement-breakpoint
CREATE INDEX "repository_dependency_scan_idx" ON "repository_dependency" ("repository_scan_id");--> statement-breakpoint
CREATE INDEX "repository_dependency_package_idx" ON "repository_dependency" ("ecosystem","name");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_language_scan_language_idx" ON "repository_language" ("repository_scan_id","language_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_scan_scan_repository_idx" ON "repository_scan" ("scan_id","repository_id");--> statement-breakpoint
CREATE INDEX "repository_scan_repository_completed_idx" ON "repository_scan" ("repository_id","completed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_technology_scan_technology_idx" ON "repository_technology" ("repository_scan_id","technology_id");--> statement-breakpoint
CREATE INDEX "repository_technology_technology_idx" ON "repository_technology" ("technology_id");--> statement-breakpoint
CREATE INDEX "scan_user_created_idx" ON "scan" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "technology_evidence_repository_technology_idx" ON "technology_evidence" ("repository_technology_id");--> statement-breakpoint
ALTER TABLE "repository_dependency" ADD CONSTRAINT "repository_dependency_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_dependency" ADD CONSTRAINT "repository_dependency_VleLl1VWAR6S_fkey" FOREIGN KEY ("repository_scan_id") REFERENCES "repository_scan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_language" ADD CONSTRAINT "repository_language_language_id_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "language"("id");--> statement-breakpoint
ALTER TABLE "repository_language" ADD CONSTRAINT "repository_language_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_language" ADD CONSTRAINT "repository_language_repository_scan_id_repository_scan_id_fkey" FOREIGN KEY ("repository_scan_id") REFERENCES "repository_scan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_scan" ADD CONSTRAINT "repository_scan_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_scan" ADD CONSTRAINT "repository_scan_scan_id_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_technology" ADD CONSTRAINT "repository_technology_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_technology" ADD CONSTRAINT "repository_technology_h8bhdEY6ntJN_fkey" FOREIGN KEY ("repository_scan_id") REFERENCES "repository_scan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_technology" ADD CONSTRAINT "repository_technology_technology_id_technology_id_fkey" FOREIGN KEY ("technology_id") REFERENCES "technology"("id");--> statement-breakpoint
ALTER TABLE "scan" ADD CONSTRAINT "scan_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "technology_evidence" ADD CONSTRAINT "technology_evidence_2QB9Pfkf79sw_fkey" FOREIGN KEY ("repository_technology_id") REFERENCES "repository_technology"("id") ON DELETE CASCADE;