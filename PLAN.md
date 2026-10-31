Subscription Management System Delivery Plan (5 Phases, 2 Developers)

Implementation boundary
- The actual application is built in the root `Backend/` and later `Frontend/`
  directories.
- The application uses npm and a modular backend structure; it does not use a
  workspace or `apps/`/`packages/` layout.

Goal
- Build the full subscription management system strictly according to the project requirements document.
- Work in 5 execution phases with backend and frontend handoff notes at each phase boundary.

Team Structure
- Backend developer: owns APIs, database schema, business rules, background jobs, auth, authorization, performance, and tests on backend side.
- Frontend developer: owns UI flows, forms, validation UX, role-based screens, portal/admin/staff journeys, and tests on frontend side.

Cross-Phase Working Rules
1. Backend completes phase N implementation first.
2. Backend writes/updates Frontend.md with:
   - API endpoints
   - request/response payloads
   - validation rules and error shapes
   - auth/role requirements
   - status enums and lifecycle transitions
   - pagination/filter/sort query params
3. Frontend implements phase N UI against that contract.
4. Frontend writes/updates Backend.md with:
   - integration gaps
   - contract clarifications needed
   - edge cases observed
   - payload/field mismatches
5. Backend starts phase N+1 using Backend.md feedback.

Definition of Done (per phase)
- Backend:
  - Migration/schema complete and reversible
  - API contract stable and documented in Frontend.md
  - Unit/integration tests pass for new module paths
  - Access control enforced per role
- Frontend:
  - Screens and flows complete for phase scope
  - Handles validation, loading, empty, and error states
  - Role-specific visibility implemented
  - UI tests pass for critical flow
- Joint:
  - Manual smoke test done for the phase flow end-to-end

-----------------------------------------------------------------------
Phase 1: Foundation, Authentication, Roles, and Core Master Data
-----------------------------------------------------------------------
Backend Scope
- Authentication and user lifecycle:
  - Signup with unique email and strong password policy:
    - minimum length > 8
    - uppercase + lowercase + special character required
  - Login, logout/session handling
  - Forgot password and reset password (email reset flow)
- Authorization:
  - Roles: ADMIN, STAFF, CUSTOMER
  - Enforce route-level and operation-level permissions
  - Only ADMIN can create STAFF users
- Core entities and base setup:
  - Users and customer profile/contact linkage
  - Product master:
    - name, type, sales price, cost price, notes
  - Product variant support with additive pricing (example: brand price delta)
  - Plan master:
    - billing frequency (daily/weekly/monthly/yearly)
    - minimum quantity
    - available-from / available-until
    - policy flags: auto-close, allow early close, allow pause, allow renew
- Seed baseline enums and role-safe defaults

Frontend Scope
- Auth screens:
  - Signup, login, forgot password, reset password
- Role-aware shell and navigation:
  - Admin area, staff area, customer portal entry
- Admin screens:
  - Staff user creation
  - Product CRUD with variants
  - Plan CRUD with lifecycle policy options
- Basic form validation aligned with backend rules

Phase 1 Handoff Deliverables
- Backend -> Frontend.md:
  - Auth endpoints and token/session behavior
  - User role payload shape
  - Product, variant, and plan CRUD APIs
  - Validation errors and permission errors
- Frontend -> Backend.md:
  - Missing fields, response shape adjustments, UX-blocking validation needs

-----------------------------------------------------------------------
Phase 2: Quotations, Subscription Creation, and Lifecycle States
-----------------------------------------------------------------------
Backend Scope
- Quotation template module:
  - template lines for plans/products
  - validity days
- Subscription module:
  - unique subscription number generation
  - fields: customer, plan, start date, expiry date, payment terms
  - line items: product, quantity, unit price, taxes, line amount
- Subscription lifecycle transitions:
  - Draft -> Quotation -> Confirmed -> Active -> Closed
  - enforce valid state transitions
  - support close/pause/renew where plan policy allows
- Listing APIs with filter/search by status, customer, date ranges

Frontend Scope
- Template management screens (admin/staff as authorized)
- Subscription creation/edit flow from template and from scratch
- Lifecycle transition controls with role + state-aware actions
- Subscription detail view with timeline/status visibility

Phase 2 Handoff Deliverables
- Backend -> Frontend.md:
  - state machine rules and transition endpoints
  - template and subscription schemas
  - status enums, allowable actions per state
- Frontend -> Backend.md:
  - state transition UX edge cases and API ergonomics feedback

-----------------------------------------------------------------------
Phase 3: Billing Engine, Invoice Workflow, and Payment Recording
-----------------------------------------------------------------------
Backend Scope
- Invoice generation from subscriptions:
  - auto-populate customer details, lines, taxes, totals
  - idempotent billing to prevent double-billing/skips
- Invoice status lifecycle:
  - Draft -> Confirmed -> Paid
  - cancel/send/print tracking actions
- Tax rule application:
  - apply configured tax rules on invoice lines and totals
- Payment module:
  - record method, amount, date, note against invoice
  - enforce payment reconciliation constraints (no over-allocation)
- Due/outstanding computation

Frontend Scope
- Billing-day views and invoice management UI
- Invoice listing/detail with status actions and print/send triggers
- Payment entry and invoice payment history
- Outstanding/paid visual indicators and quick filters

Phase 3 Handoff Deliverables
- Backend -> Frontend.md:
  - billing run endpoint contract and idempotency behavior
  - invoice/payment APIs and status transitions
  - tax breakdown response shape
- Frontend -> Backend.md:
  - invoice action UX feedback and reconciliation edge cases

-----------------------------------------------------------------------
Phase 4: Discounts, Auto-Application Rules, and Customer Portal
-----------------------------------------------------------------------
Backend Scope
- Discount rules (ADMIN only create/update):
  - fixed amount or percentage
  - minimum purchase/quantity conditions
  - start/end dates
  - max usage count
  - target scope: products or full subscription
- Automatic discount application to next eligible invoice
- Expiry/exhaustion handling so rules stop automatically
- Customer portal APIs:
  - customer sees own subscriptions/invoices only
  - read-only and action permissions according to requirements

Frontend Scope
- Admin discount rule management screens
- Rule targeting UI (product-level vs subscription-level)
- Customer portal:
  - own subscriptions
  - own invoices
  - payment/dues visibility
- Staff/admin views for discount effects on invoices

Phase 4 Handoff Deliverables
- Backend -> Frontend.md:
  - discount rule schema, eligibility logic, and error cases
  - portal-scoped endpoints and auth boundaries
- Frontend -> Backend.md:
  - clarity issues on discount applicability/explanations in UI

-----------------------------------------------------------------------
Phase 5: Reporting Dashboard, Performance, Hardening, and Final QA
-----------------------------------------------------------------------
Backend Scope
- Finance summary/report APIs:
  - active subscriptions count
  - collected revenue
  - outstanding revenue
  - overdue invoices
  - filter support and summary aggregates
- Performance work:
  - indexing/query tuning
  - target: report/list pages respond under 2 seconds at high volume
- Security and reliability hardening:
  - role checks review
  - input validation and error consistency audit
  - background job resilience checks
- Final backend test pass and bug fixes

Frontend Scope
- Finance dashboard and summary widgets
- Filterable views for subscriptions, invoices, overdue items
- Performance-aware rendering for large lists
- Final UX polish and integration bug fixes

Phase 5 Handoff Deliverables
- Backend -> Frontend.md:
  - final reporting endpoints and filter contract
  - known constraints and data freshness expectations
- Frontend -> Backend.md:
  - last-mile defects and integration observations

-----------------------------------------------------------------------
Post-Phase Global Test and Bug-Fix Pass
-----------------------------------------------------------------------
- End-to-end test all key scenarios:
  - signup/login/reset
  - product/plan setup
  - quote -> subscription lifecycle
  - billing -> invoice -> payment
  - discount auto-application
  - finance dashboard numbers
- Fix defects by severity:
  - critical data correctness
  - billing/invoice/payment correctness
  - auth/authorization issues
  - UX blockers
- Freeze release candidate only after both developer sign-offs.

-----------------------------------------------------------------------
Progress Log (backend)
-----------------------------------------------------------------------
Phase 1 - complete
- npm-based `Backend/` with modular seven-layer modules
  (`types`, `validators`, `repository`, `services`, `controller`, `routes`, `index`).
- Auth: signup, login, refresh, logout, me, forgot/reset password.
- Roles enforced: ADMIN, STAFF, CUSTOMER; only ADMIN creates staff.
- Catalog: product CRUD with additive-price variants, plan CRUD with lifecycle
  policy flags, guarded deactivation when in use.
- Shared conventions: pagination helper, validation errors, Prisma error mapping,
  invalid-JSON handling, initial migration and seed.

Phase 2 - complete
- Payment terms module (admin managed, guarded deactivation).
- Quotation templates with validity days, plan link and priced lines.
- Subscriptions: unique `SUB-<year>-<sequence>` numbering, customer, plan,
  start/expiry dates, payment terms, priced lines with per-line tax.
- Lifecycle state machine (`DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED`)
  with pause, resume, cancel, renewal and plan-policy enforcement.
- Available actions surfaced per subscription for the UI.
- Automatic closing of expired subscriptions on auto-close plans, exposed as an
  endpoint and a 15-minute background job.
- Filtering by status, customer, plan, date range and free-text search.

Phase 3 - complete
- Added invoice, invoice-line, and payment persistence with invoice status and
  payment-method enums.
- Added the modular invoices feature with invoice generation from active
  subscriptions, billing-period idempotency, billing runs, customer/line
  snapshots, tax totals, and due-date calculation from payment terms.
- Added invoice actions for confirm, cancel, send, and print tracking.
- Added payment recording with atomic balance checks, partial-payment support,
  and automatic transition to `PAID`.
- Documented invoice and payment APIs in `Frontend.md`.

Phase 4 - complete
- Added discount rules with fixed or percentage values, product or
  subscription scope, thresholds, active dates, and usage limits.
- Added admin-only discount CRUD with soft deactivation and rule validation.
- Added atomic, non-stacking discount selection during invoice creation and
  invoice discount snapshots.
- Added customer-only portal endpoints for owned subscriptions and invoices,
  including payment, balance, and discount visibility.
- Documented discount and portal APIs in `Frontend.md`.

Phase 5 - complete
- Added ADMIN/STAFF finance reporting endpoints for summary metrics and
  paginated overdue invoices with date, customer, plan, status, and search
  filters.
- Finance reports use aggregate database queries for high-volume summary
  paths; active subscriptions include `ACTIVE` and `PAUSED`.
- Added invoice/payment/subscription report indexes through migration
  `0004_reporting_hardening`.
- Added refresh-token versioning. Logout and password reset invalidate older
  refresh tokens while preserving the existing cookie contract.
- Added report validation tests and completed the final backend validation pass.

Verification
- `npm run prisma:generate`, `npm run typecheck`, `npm run build`, and
  `npm test` (39 tests) pass.
- End-to-end smoke run against PostgreSQL covered auth, catalog, quotations,
  subscription creation, every lifecycle transition, renewal, filters, auto-close
  and password reset.
- Live migration application remains environment-dependent until
  `Backend/.env` provides a configured `DATABASE_URL`.