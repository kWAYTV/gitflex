CREATE TABLE "profile_snapshot" (
	"analyzer_version" text NOT NULL,
	"breakdown" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"grade" text,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"overall_score" real,
	"scan_id" uuid NOT NULL,
	"scoring_version" text NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "score" (
	"calculated_at" timestamp with time zone NOT NULL,
	"confidence" real NOT NULL,
	"dimension" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"score" real,
	"scoring_version" text NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "profile_snapshot_scan_version_idx" ON "profile_snapshot" ("scan_id","scoring_version");--> statement-breakpoint
CREATE INDEX "profile_snapshot_user_created_idx" ON "profile_snapshot" ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "score_snapshot_dimension_idx" ON "score" ("snapshot_id","dimension");--> statement-breakpoint
CREATE INDEX "score_user_dimension_idx" ON "score" ("user_id","dimension");--> statement-breakpoint
ALTER TABLE "profile_snapshot" ADD CONSTRAINT "profile_snapshot_scan_id_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scan"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "profile_snapshot" ADD CONSTRAINT "profile_snapshot_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_snapshot_id_profile_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "profile_snapshot"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "score" ADD CONSTRAINT "score_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;