CREATE TYPE "repository_owner_type" AS ENUM('user', 'organization');--> statement-breakpoint
CREATE TYPE "repository_ownership" AS ENUM('owner', 'organization', 'collaborator');--> statement-breakpoint
CREATE TYPE "repository_visibility" AS ENUM('public', 'private', 'internal');--> statement-breakpoint
CREATE TABLE "repository" (
	"default_branch" text,
	"description" text,
	"forks" integer NOT NULL,
	"full_name" text NOT NULL,
	"github_created_at" timestamp with time zone NOT NULL,
	"github_id" bigint NOT NULL,
	"github_updated_at" timestamp with time zone NOT NULL,
	"html_url" text NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"is_archived" boolean NOT NULL,
	"is_disabled" boolean NOT NULL,
	"is_fork" boolean NOT NULL,
	"last_synced_at" timestamp with time zone NOT NULL,
	"license" text,
	"name" text NOT NULL,
	"node_id" text NOT NULL,
	"owner_github_id" bigint NOT NULL,
	"owner_login" text NOT NULL,
	"owner_type" "repository_owner_type" NOT NULL,
	"parent_full_name" text,
	"parent_github_id" bigint,
	"primary_language" text,
	"pushed_at" timestamp with time zone,
	"size_kb" integer NOT NULL,
	"stars" integer NOT NULL,
	"topics" text[] DEFAULT '{}'::text[] NOT NULL,
	"visibility" "repository_visibility" NOT NULL,
	"watchers" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repository_selection" (
	"first_seen_at" timestamp with time zone NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"included" boolean NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"ownership" "repository_ownership" NOT NULL,
	"removed_at" timestamp with time zone,
	"repository_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "repository_github_id_idx" ON "repository" ("github_id");--> statement-breakpoint
CREATE INDEX "repository_owner_login_idx" ON "repository" ("owner_login");--> statement-breakpoint
CREATE UNIQUE INDEX "repository_selection_user_repository_idx" ON "repository_selection" ("user_id","repository_id");--> statement-breakpoint
CREATE INDEX "repository_selection_repository_idx" ON "repository_selection" ("repository_id");--> statement-breakpoint
ALTER TABLE "repository_selection" ADD CONSTRAINT "repository_selection_repository_id_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repository"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "repository_selection" ADD CONSTRAINT "repository_selection_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;