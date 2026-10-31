# Backend Handoff to Frontend

Backend location: `Backend/` (npm project). Base URL: `http://localhost:4000/api`.

This document covers Phase 1 (foundation, auth, roles, catalog), Phase 2
(quotation templates, subscriptions, lifecycle), Phase 3 (invoices,
billing, taxes, and payments), Phase 4 (discounts and customer portal), and
Phase 5 (finance reporting, performance, and session hardening).

## Conventions

- Success: `{ "data": ... }`
- Error: `{ "error": { "code": "...", "message": "...", "details": {} } }`
- Lists: `{ "data": { "items": [], "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 } } }`
- Money values (`Decimal` in the database) are returned as **strings**, for
  example `"2200"`. Parse them before formatting; never assume numbers.
- Dates are ISO-8601 strings.
- Auth is cookie based: `accessToken` and `refreshToken` HTTP-only cookies.
  Send `credentials: "include"`. A `Authorization: Bearer <token>` header is
  also accepted.

### Roles

| API value | UI label | Notes |
|---|---|---|
| `ADMIN` | Admin | Full access, only role that can manage users, products, plans, payment terms and discounts |
| `STAFF` | Staff | Day-to-day work: quotations and subscriptions |
| `CUSTOMER` | Customer | Own portal data (portal endpoints arrive in Phase 4) |

### Common error codes

| Code | HTTP | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Field errors in `details.fieldErrors` |
| `AUTH_REQUIRED` | 401 | No access token |
| `INVALID_TOKEN` | 401 | Expired or invalid access token |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password |
| `ACCOUNT_INACTIVE` | 403 | Account disabled by admin |
| `FORBIDDEN` | 403 | Role not allowed |
| `NOT_FOUND` | 404 | Record missing |
| `DUPLICATE_RECORD` | 409 | Unique constraint hit |
| `INVALID_JSON` | 400 | Malformed request body |

## Authentication

### `POST /auth/signup`

```json
{ "email": "customer@example.com", "password": "Strong@123", "name": "Customer Name" }
```

Password rules: 9+ characters, upper and lower case, at least one special
character. Creates a `CUSTOMER` and signs them in (cookies set). `201`.

### `POST /auth/login`

```json
{ "email": "customer@example.com", "password": "Strong@123" }
```

Returns `{ "data": { "user": { "id", "email", "name", "role" } } }` and sets cookies.

### `POST /auth/refresh`

Uses the refresh cookie. Returns a new session and rotated cookies.
`401 REFRESH_TOKEN_REQUIRED` / `INVALID_REFRESH_TOKEN` when unavailable — the
frontend should treat this as signed out.

### `POST /auth/logout`

Clears cookies and invalidates the current user's refresh-token family.
Logout remains safe to call when the access token has already expired.
`204`.

### `GET /auth/me`

Returns the signed-in user. Requires a valid access token.

### `POST /auth/forgot-password`

```json
{ "email": "customer@example.com" }
```

Always returns the same generic message. In non-production the response also
contains `resetToken` so the flow can be tested without email delivery:

```json
{ "data": { "message": "If the email is registered, a password reset link has been sent.", "resetToken": "..." } }
```

### `POST /auth/reset-password`

```json
{ "token": "from-email-link", "password": "NewStrong@123", "confirmPassword": "NewStrong@123" }
```

Tokens are single use and expire after one hour (`400 RESET_TOKEN_INVALID`).

## Users (ADMIN only)

### `GET /users?page=&pageSize=&search=&role=&isActive=`

`role` is `ADMIN | STAFF | CUSTOMER`, `isActive` is `true | false`.

### `GET /users/:id`

### `POST /users`

Only admins may create staff.

```json
{
  "email": "staff@example.com",
  "password": "Staff@1234",
  "name": "Staff Member",
  "role": "STAFF"
}
```

### `PATCH /users/:id`

```json
{ "name": "Updated", "email": "updated@example.com", "isActive": false }
```

`403 ADMIN_LOCKED` for admin accounts, `400 SELF_DISABLE_BLOCKED` when an admin
tries to disable themselves.

## Catalog

### Products

- `GET /catalog/products?page=&pageSize=&search=&type=&isActive=` (public)
- `GET /catalog/products/:id` (public)
- `POST /catalog/products` (ADMIN)
- `PATCH /catalog/products/:id` (ADMIN)
- `DELETE /catalog/products/:id` (ADMIN, soft delete, `204`)

Create/update body:

```json
{
  "name": "Business Suite",
  "type": "SERVICE",
  "salesPrice": 1500,
  "costPrice": 400,
  "notes": "Optional notes",
  "isActive": true,
  "variants": [
    { "attribute": "Brand", "value": "Odoo", "extraPrice": 560, "isActive": true }
  ]
}
```

- `type` is `GOODS | SERVICE`.
- Variant `extraPrice` is additive on top of `salesPrice`.
- Duplicate attribute/value pairs are rejected.
- `PATCH` replaces the whole variant list when `variants` is supplied.
- `DELETE` deactivates the product (it stays visible to admin filters).

### Plans

- `GET /catalog/plans?page=&pageSize=&search=&frequency=&isActive=` (public)
- `GET /catalog/plans/:id` (public, includes inactive plans)
- `POST /catalog/plans` (ADMIN)
- `PATCH /catalog/plans/:id` (ADMIN)
- `DELETE /catalog/plans/:id` (ADMIN, soft delete, `204`)

```json
{
  "name": "Business Monthly",
  "price": 1500,
  "frequency": "MONTHLY",
  "minimumQuantity": 1,
  "availableFrom": "2026-11-01T00:00:00.000Z",
  "availableUntil": "2027-11-01T00:00:00.000Z",
  "autoClose": false,
  "allowEarlyClose": true,
  "allowPause": true,
  "allowRenew": true,
  "isActive": true
}
```

`frequency` is `DAILY | WEEKLY | MONTHLY | YEARLY`. Deactivation returns
`409 PLAN_IN_USE` while subscriptions are `CONFIRMED`, `ACTIVE` or `PAUSED`.

## Payment terms

- `GET /payment-terms?page=&pageSize=&search=&isActive=` (any signed-in user)
- `GET /payment-terms/:id`
- `POST /payment-terms` (ADMIN)
- `PATCH /payment-terms/:id` (ADMIN)
- `DELETE /payment-terms/:id` (ADMIN, soft delete)

```json
{ "name": "Net 30", "dueDays": 30, "isActive": true }
```

Deactivation returns `409 PAYMENT_TERM_IN_USE` while subscriptions reference it.

## Invoices and payments (ADMIN, STAFF)

Invoice generation is idempotent for a subscription billing period. The
backend derives a unique billing key from the subscription and the inclusive
`periodStart`/`periodEnd` timestamps. Repeating the same request returns the
existing invoice instead of creating a duplicate.

### `GET /invoices?page=&pageSize=&search=&status=&customerId=&subscriptionId=&dueDateFrom=&dueDateTo=`

Returns paginated invoices. Each item includes customer and subscription
snapshots, invoice lines, payments, totals, and a computed `balanceDue`.
Invoice monetary values are serialized as strings.

### `POST /invoices/generate`

Creates a draft invoice from an active subscription. `periodStart` defaults to
the subscription start date and `periodEnd` defaults to one plan billing period
later minus one millisecond. The final period is shortened to the subscription
expiry date when needed.

```json
{
  "subscriptionId": "subscription-uuid",
  "periodStart": "2026-11-01T00:00:00.000Z",
  "periodEnd": "2026-11-30T23:59:59.999Z",
  "issueDate": "2026-11-01T00:00:00.000Z"
}
```

The response is `{ "data": { "invoice": {}, "created": true } }`. Repeated
period requests return `created: false`.

### `POST /invoices/billing-run` (ADMIN)

Generates all due periods for active subscriptions up to `asOf`. If omitted,
`asOf` is the current server time. Missed periods are generated sequentially
and each period remains idempotent.

```json
{ "asOf": "2026-11-30T23:59:59.999Z" }
```

The response includes `processedSubscriptions`, `createdCount`,
`existingCount`, and generated `invoiceNumbers`.

### `GET /invoices/:id`

Returns invoice details with:

- Customer and subscription snapshots.
- Product and variant descriptions captured at billing time.
- Per-line `quantity`, `unitPrice`, `taxRate`, `taxAmount`, and `lineAmount`.
- `subtotal`, `taxTotal`, `total`, `amountPaid`, and `balanceDue`.
- Payment history and delivery tracking timestamps.

### `POST /invoices/:id/action`

```json
{ "action": "CONFIRM" }
```

Actions are `CONFIRM`, `CANCEL`, `SEND`, and `PRINT`.

- `DRAFT -> CONFIRMED` with `confirmedAt`.
- `DRAFT` or `CONFIRMED -> CANCELLED` with optional `reason`.
- `SEND` records `sentAt`; the invoice must be confirmed or paid.
- `PRINT` records `printedAt`; the invoice must be confirmed or paid.
- Paid or cancelled invoices cannot be cancelled.

### `POST /invoices/:id/payments`

Payments can be recorded only against confirmed invoices.

```json
{
  "amount": 1000,
  "method": "BANK_TRANSFER",
  "paidAt": "2026-11-15T12:00:00.000Z",
  "note": "First installment",
  "reference": "BANK-001"
}
```

Methods are `CASH`, `BANK_TRANSFER`, `CARD`, and `OTHER`. Payments cannot
exceed the current balance. A payment that settles the balance transitions the
invoice to `PAID`; partial payments leave it `CONFIRMED`. Overpayment returns
`409 PAYMENT_EXCEEDS_BALANCE`.

## Discounts (ADMIN only)

Discount rules are soft-deactivated and can target either a product or the
whole subscription. The backend applies at most one rule per invoice: the
eligible rule with the highest monetary saving wins. This prevents accidental
stacking of multiple promotions.

### `GET /discounts?page=&pageSize=&search=&type=&scope=&isActive=`

### `POST /discounts`

```json
{
  "name": "Annual customer discount",
  "description": "10 percent off subscription invoices",
  "type": "PERCENTAGE",
  "scope": "SUBSCRIPTION",
  "value": 10,
  "minPurchase": 1000,
  "minQuantity": 1,
  "startsAt": "2026-11-01T00:00:00.000Z",
  "endsAt": "2027-12-31T23:59:59.999Z",
  "maxUsageCount": 100,
  "isActive": true
}
```

Product-targeted rules use `"scope": "PRODUCT"` and require a `productId`.
`type` is `FIXED` or `PERCENTAGE`. Percentage values are between 0 and 100.
`minPurchase` and `minQuantity` are eligibility thresholds. `maxUsageCount`
is optional; omitted means unlimited use.

- `PATCH /discounts/:id` updates a rule.
- `DELETE /discounts/:id` soft-deactivates a rule.
- `GET /discounts/:id` returns the rule and current usage count.

Eligible rules are evaluated when an invoice is created. The invoice stores a
discount snapshot with `name`, `type`, `scope`, `value`, and `amount`.
`discountTotal` is subtracted from the invoice subtotal before the final total
is calculated. Usage reservation is atomic, so concurrent billing cannot
exceed a rule's maximum usage.

## Customer portal (CUSTOMER only)

Portal endpoints derive the customer ID from the authenticated access token;
the client cannot request another customer's records.

### `GET /portal/subscriptions?page=&pageSize=&status=`

Returns the signed-in customer's subscriptions, including plan, line, and
lifecycle information.

### `GET /portal/subscriptions/:id`

Returns one subscription only when it belongs to the signed-in customer.
Missing or foreign subscription IDs return `404 SUBSCRIPTION_NOT_FOUND`.

### `GET /portal/invoices?page=&pageSize=&status=`

Returns the signed-in customer's invoices, including totals, `discountTotal`,
`balanceDue`, invoice lines, applied discount snapshots, and payment history.

### `GET /portal/invoices/:id`

Returns one invoice only when it belongs to the signed-in customer. Missing or
foreign invoice IDs return `404 INVOICE_NOT_FOUND`.

## Finance reports (ADMIN, STAFF)

Reports are calculated from committed invoice and payment records at request
time; there is no reporting cache. Money values are returned as numbers rounded
to two decimal places, unlike persisted `Decimal` fields which are serialized
as strings elsewhere in this contract.

### `GET /reports/finance`

Optional query parameters:

- `from` and `to`: inclusive ISO date bounds. `to` cannot precede `from`.
- `asOf`: ISO timestamp used when determining whether an invoice is overdue;
  defaults to the current server time.
- `customerId` and `planId`: UUID filters.
- `status`: `DRAFT | CONFIRMED | PAID | CANCELLED` filter for collected
  payment records.

Example response:

```json
{
  "data": {
    "asOf": "2026-12-01T00:00:00.000Z",
    "filters": {
      "from": "2026-11-01T00:00:00.000Z",
      "to": "2026-11-30T23:59:59.999Z",
      "customerId": null,
      "planId": null,
      "status": null
    },
    "activeSubscriptions": 12,
    "collectedRevenue": 18000,
    "outstandingRevenue": 4200,
    "outstandingInvoiceCount": 3,
    "overdueInvoices": 1,
    "overdueAmount": 1200
  }
}
```

`activeSubscriptions` includes subscriptions in `ACTIVE` and `PAUSED` states.
Outstanding and overdue balances use confirmed, non-cancelled invoices and are
computed as `total - amountPaid`, never below zero. Overdue invoices have a
`dueDate` before `asOf`; the date filters apply to their due dates.

### `GET /reports/overdue-invoices`

Returns paginated invoice details for invoices whose `dueDate` is before
`asOf`. It accepts `page`, `pageSize` (maximum 100), `from`, `to`, `asOf`,
`customerId`, `planId`, `status`, and `search`. Search matches invoice number,
customer name, or customer email. The default status is `CONFIRMED`; use
`status=PAID` only when explicitly inspecting paid invoices that were overdue.

Each item includes the normal invoice detail shape and a computed numeric
`balanceDue`. The response uses the standard `{ items, pagination }` list
shape.

## Quotation templates (ADMIN, STAFF)

- `GET /quotations?page=&pageSize=&search=&isActive=`
- `POST /quotations`
- `GET /quotations/:id`
- `PATCH /quotations/:id`
- `DELETE /quotations/:id`

```json
{
  "name": "Large Customer Offer",
  "description": "Yearly contract offer",
  "validityDays": 14,
  "planId": "plan-uuid",
  "isActive": true,
  "lines": [
    { "productId": "product-uuid", "quantity": 3, "taxRate": 18, "sortOrder": 0 }
  ]
}
```

- At least one line is required.
- `unitPrice` is optional; when omitted the product sales price (plus variant
  extra price) is used when the template is turned into a subscription.
- A template used by open subscriptions cannot be deactivated
  (`409 QUOTATION_IN_USE`).
- `PATCH` replaces the whole line set when `lines` is supplied.

## Subscriptions (ADMIN, STAFF)

Statuses: `DRAFT`, `QUOTATION`, `CONFIRMED`, `ACTIVE`, `PAUSED`, `CLOSED`,
`CANCELLED`.

### `GET /subscriptions?page=&pageSize=&search=&status=&customerId=&planId=&startDateFrom=&startDateTo=`

`search` matches subscription number, customer name or customer email.

### `POST /subscriptions`

```json
{
  "customerId": "customer-uuid",
  "planId": "plan-uuid",
  "quotationTemplateId": "template-uuid",
  "startDate": "2026-11-01T00:00:00.000Z",
  "expiryDate": "2027-11-01T00:00:00.000Z",
  "paymentTermId": "payment-term-uuid",
  "notes": "Optional",
  "lines": [
    { "productId": "product-uuid", "quantity": 3, "taxRate": 18 }
  ]
}
```

Rules enforced by the API:

- `customerId` must reference an active `CUSTOMER`.
- Either `planId` or a `quotationTemplateId` that has a plan is required.
- The plan must be active and the start date must fall inside its availability
  window.
- Each line quantity must meet the plan `minimumQuantity`.
- `unitPrice` is optional per line; it defaults to the product sales price plus
  any variant extra price.
- When a template is used and `lines` is omitted, the template lines are copied.
- When a template is used the subscription starts in `QUOTATION` with
  `quotationValidUntil = startDate + validityDays`. Otherwise it starts in
  `DRAFT`.
- The subscription number is generated as `SUB-<year>-<sequence>`, for example
  `SUB-2026-000001`.

The response includes `subtotal`, `taxTotal`, `total`, resolved `lines`, the
`plan`, the `customer` and the `paymentTerm`.

### `GET /subscriptions/:id`

Returns the subscription plus `availableActions`, an array of the transitions
currently allowed:

```json
{ "data": { "...": "...", "availableActions": ["SUBMIT", "CANCEL"] } }
```

### `PATCH /subscriptions/:id`

Only allowed in `DRAFT` or `QUOTATION` (`409 SUBSCRIPTION_LOCKED` otherwise).

```json
{
  "startDate": "2026-11-05T00:00:00.000Z",
  "expiryDate": null,
  "paymentTermId": null,
  "notes": "Updated",
  "lines": [{ "productId": "product-uuid", "quantity": 2, "taxRate": 18 }]
}
```

Totals are recalculated when lines change.

### `POST /subscriptions/:id/transition`

```json
{ "action": "ACTIVATE", "reason": "Optional" }
```

| Action | Allowed from | Result |
|---|---|---|
| `SUBMIT` | `DRAFT` | `QUOTATION` |
| `CONFIRM` | `QUOTATION` | `CONFIRMED` |
| `ACTIVATE` | `CONFIRMED` | `ACTIVE` |
| `PAUSE` | `ACTIVE` | `PAUSED` |
| `RESUME` | `PAUSED` | `ACTIVE` |
| `CLOSE` | `CONFIRMED`, `ACTIVE`, `PAUSED` | `CLOSED` |
| `CANCEL` | `DRAFT`, `QUOTATION`, `CONFIRMED` | `CANCELLED` |

Additional rules:

- `CONFIRM` fails with `409 QUOTATION_EXPIRED` when the quotation validity has
  passed.
- `PAUSE` requires the plan flag `allowPause` (`409 PAUSE_NOT_ALLOWED`).
- `CLOSE` before the expiry date requires the plan flag `allowEarlyClose`
  (`409 EARLY_CLOSE_NOT_ALLOWED`).
- Any other invalid combination returns `409 INVALID_TRANSITION`.

Use `availableActions` to render buttons instead of hard-coding these rules.

### `POST /subscriptions/:id/renew`

```json
{ "startDate": "2027-11-02T00:00:00.000Z", "expiryDate": "2028-11-01T00:00:00.000Z" }
```

Both fields are optional. The source must be `ACTIVE` or `CLOSED`, and the plan
must allow renewal (`409 RENEW_NOT_ALLOWED`). A new `DRAFT` subscription is
created with the same customer, plan, payment term and lines, and
`renewedFromId` set to the source.

### `POST /subscriptions/auto-close` (ADMIN)

Closes `ACTIVE` subscriptions whose plan has `autoClose` enabled and whose
expiry date has passed. Returns `{ "data": { "closedCount": 0, "closedIds": [] } }`.
The same job also runs automatically every 15 minutes while the server is up.

## Frontend checklist

- Keep all requests credentialed so cookies are sent.
- Gate navigation with the role from `/auth/me`.
- Render money from strings (`Number(value).toFixed(2)` or a formatter).
- Drive subscription action buttons from `availableActions`.
- Surface `409` business rules as friendly messages, not generic errors.
- Use `details.fieldErrors` for inline form validation.
- Send ISO strings for dates; empty optional dates should be omitted or `null`.
