CREATE TYPE "profile_visibility" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TABLE "profile" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publish_private_aggregates" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"user_id" text PRIMARY KEY,
	"visibility" "profile_visibility" DEFAULT 'public'::"profile_visibility" NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;