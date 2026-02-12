-- RenameColumns: Stripe -> Paystack
ALTER TABLE "plans" RENAME COLUMN "stripe_price_monthly_id" TO "paystack_plan_code_monthly";
ALTER TABLE "plans" RENAME COLUMN "stripe_price_yearly_id" TO "paystack_plan_code_yearly";
ALTER TABLE "billing_history" RENAME COLUMN "stripe_invoice_id" TO "paystack_reference";
ALTER TABLE "organizations" RENAME COLUMN "stripe_customer_id" TO "paystack_customer_code";
ALTER TABLE "organizations" RENAME COLUMN "stripe_subscription_id" TO "paystack_subscription_code";
