-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('FIXED', 'PERCENTAGE');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('PRODUCT', 'SUBSCRIPTION');

-- Add invoice discount total
ALTER TABLE "invoices" ADD COLUMN "discount_total" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "discount_rules" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "DiscountType" NOT NULL,
    "scope" "DiscountScope" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "min_purchase" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "min_quantity" INTEGER NOT NULL DEFAULT 0,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "max_usage_count" INTEGER,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "product_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discount_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_discounts" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "discount_rule_id" UUID,
    "name" TEXT NOT NULL,
    "type" "DiscountType" NOT NULL,
    "scope" "DiscountScope" NOT NULL,
    "value" DECIMAL(12,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_discounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "discount_rules_is_active_starts_at_ends_at_idx" ON "discount_rules"("is_active", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "discount_rules_scope_product_id_idx" ON "discount_rules"("scope", "product_id");

-- CreateIndex
CREATE INDEX "invoice_discounts_invoice_id_idx" ON "invoice_discounts"("invoice_id");

-- CreateIndex
CREATE INDEX "invoice_discounts_discount_rule_id_idx" ON "invoice_discounts"("discount_rule_id");

-- AddForeignKey
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_discounts" ADD CONSTRAINT "invoice_discounts_discount_rule_id_fkey" FOREIGN KEY ("discount_rule_id") REFERENCES "discount_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
