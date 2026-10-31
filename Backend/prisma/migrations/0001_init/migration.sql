-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'STAFF', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('GOODS', 'SERVICE');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "reset_token_hash" TEXT,
    "reset_token_expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ProductType" NOT NULL,
    "sales_price" DECIMAL(12,2) NOT NULL,
    "cost_price" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "attribute" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "extra_price" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "frequency" "BillingFrequency" NOT NULL,
    "minimum_quantity" INTEGER NOT NULL DEFAULT 1,
    "available_from" TIMESTAMP(3),
    "available_until" TIMESTAMP(3),
    "auto_close" BOOLEAN NOT NULL DEFAULT false,
    "allow_early_close" BOOLEAN NOT NULL DEFAULT true,
    "allow_pause" BOOLEAN NOT NULL DEFAULT true,
    "allow_renew" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_terms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "due_days" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_templates" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "validity_days" INTEGER NOT NULL,
    "plan_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotation_template_lines" (
    "id" UUID NOT NULL,
    "template_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(12,2),
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotation_template_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "payment_term_id" UUID,
    "quotation_template_id" UUID,
    "quotation_valid_until" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tax_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "cancelled_reason" TEXT,
    "paused_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "renewed_from_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_lines" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "line_amount" DECIMAL(12,2) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sequences" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sequences_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE INDEX "products_type_is_active_idx" ON "products"("type", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_product_id_attribute_value_key" ON "product_variants"("product_id", "attribute", "value");

-- CreateIndex
CREATE INDEX "plans_frequency_is_active_idx" ON "plans"("frequency", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "payment_terms_name_key" ON "payment_terms"("name");

-- CreateIndex
CREATE INDEX "payment_terms_is_active_idx" ON "payment_terms"("is_active");

-- CreateIndex
CREATE INDEX "quotation_templates_is_active_idx" ON "quotation_templates"("is_active");

-- CreateIndex
CREATE INDEX "quotation_template_lines_template_id_idx" ON "quotation_template_lines"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_number_key" ON "subscriptions"("number");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_renewed_from_id_key" ON "subscriptions"("renewed_from_id");

-- CreateIndex
CREATE INDEX "subscriptions_status_start_date_idx" ON "subscriptions"("status", "start_date");

-- CreateIndex
CREATE INDEX "subscriptions_customer_id_status_idx" ON "subscriptions"("customer_id", "status");

-- CreateIndex
CREATE INDEX "subscriptions_plan_id_status_idx" ON "subscriptions"("plan_id", "status");

-- CreateIndex
CREATE INDEX "subscription_lines_subscription_id_idx" ON "subscription_lines"("subscription_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_templates" ADD CONSTRAINT "quotation_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "quotation_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotation_template_lines" ADD CONSTRAINT "quotation_template_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_payment_term_id_fkey" FOREIGN KEY ("payment_term_id") REFERENCES "payment_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_quotation_template_id_fkey" FOREIGN KEY ("quotation_template_id") REFERENCES "quotation_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_renewed_from_id_fkey" FOREIGN KEY ("renewed_from_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_lines" ADD CONSTRAINT "subscription_lines_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

