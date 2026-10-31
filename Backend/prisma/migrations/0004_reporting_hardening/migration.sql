-- Add refresh-token revocation versioning
ALTER TABLE "users" ADD COLUMN "refresh_token_version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "invoices_status_issue_date_idx" ON "invoices"("status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_status_due_date_customer_id_idx" ON "invoices"("status", "due_date", "customer_id");

-- CreateIndex
CREATE INDEX "payments_paid_at_idx" ON "payments"("paid_at");
