CREATE TYPE "public"."audit_action" AS ENUM('USER_REGISTERED', 'USER_LOGIN', 'USER_LOGIN_FAILED', 'USER_LOGOUT', 'USER_PASSWORD_CHANGED', 'USER_PASSWORD_RESET', 'USER_STATUS_CHANGED', 'USER_ROLE_CHANGED', 'RESOURCE_CREATED', 'RESOURCE_UPDATED', 'RESOURCE_REMOVED', 'RESOURCE_HIDDEN', 'RESOURCE_RESTORED', 'LOAN_CREATED', 'LOAN_RETURNED', 'LOAN_CANCELLED', 'LOAN_OVERDUE_FLAGGED', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_STATUS_CHANGED');--> statement-breakpoint
CREATE TYPE "public"."loan_event_type" AS ENUM('created', 'return_requested', 'returned', 'cancelled', 'overdue_flagged', 'due_date_extended');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('pending', 'active', 'overdue', 'return_pending', 'returned', 'rejected', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('loan_created', 'loan_approved', 'loan_rejected', 'return_requested', 'resource_returned', 'due_soon', 'overdue', 'loan_cancelled', 'resource_hidden', 'system');--> statement-breakpoint
CREATE TYPE "public"."resource_condition" AS ENUM('new', 'like_new', 'very_good', 'good', 'acceptable');--> statement-breakpoint
CREATE TYPE "public"."resource_status" AS ENUM('available', 'requisitioned', 'unavailable', 'hidden', 'removed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('student', 'admin');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"action" "audit_action" NOT NULL,
	"entity_type" varchar(40) NOT NULL,
	"entity_id" uuid,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loan_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"actor_id" uuid,
	"event_type" "loan_event_type" NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"borrower_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"status" "loan_status" DEFAULT 'active' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_date" date NOT NULL,
	"returned_at" timestamp with time zone,
	"return_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_no_self_loan" CHECK ("loans"."borrower_id" <> "loans"."owner_id"),
	CONSTRAINT "loans_due_date_future" CHECK ("loans"."due_date" > date("loans"."requested_at"))
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(120) NOT NULL,
	"message" text NOT NULL,
	"entity_type" varchar(40),
	"entity_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "resource_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" uuid NOT NULL,
	"url" text NOT NULL,
	"alt_text" varchar(180),
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"title" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"condition" "resource_condition" NOT NULL,
	"status" "resource_status" DEFAULT 'available' NOT NULL,
	"pre_loan_status" "resource_status",
	"location" varchar(180) NOT NULL,
	"visible_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(180) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'student' NOT NULL,
	"contact" varchar(40),
	"photo_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loan_events" ADD CONSTRAINT "loan_events_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loan_events" ADD CONSTRAINT "loan_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_users_id_fk" FOREIGN KEY ("borrower_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resource_images" ADD CONSTRAINT "resource_images_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_category_id_resource_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."resource_categories"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "loan_events_loan_id_idx" ON "loan_events" USING btree ("loan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "loans_resource_active_unique" ON "loans" USING btree ("resource_id") WHERE "loans"."status" in ('active', 'overdue', 'return_pending');--> statement-breakpoint
CREATE INDEX "loans_borrower_id_idx" ON "loans" USING btree ("borrower_id");--> statement-breakpoint
CREATE INDEX "loans_owner_id_idx" ON "loans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "loans_resource_id_idx" ON "loans" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "loans_status_idx" ON "loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "loans_due_date_idx" ON "loans" USING btree ("due_date") WHERE "loans"."status" in ('active', 'overdue');--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("user_id","created_at" DESC NULLS LAST) WHERE "notifications"."is_read" = false;--> statement-breakpoint
CREATE INDEX "notifications_entity_idx" ON "notifications" USING btree ("entity_type","entity_id") WHERE "notifications"."entity_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_hash_unique" ON "refresh_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_at_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_images_cover_unique" ON "resource_images" USING btree ("resource_id") WHERE "resource_images"."is_cover" = true;--> statement-breakpoint
CREATE INDEX "resources_owner_id_idx" ON "resources" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "resources_category_id_idx" ON "resources" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status") WHERE "resources"."deleted_at" is null;--> statement-breakpoint
CREATE INDEX "resources_visible_from_idx" ON "resources" USING btree ("visible_from" DESC NULLS LAST) WHERE "resources"."deleted_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_unique" ON "users" USING btree (lower("email"));