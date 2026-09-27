# 17. Dashboard

## 17.1 Metrics

Initial dashboard metrics:

-   total leads
-   new leads
-   contacted leads
-   leads by pipeline stage
-   won leads
-   lost leads
-   pending documents
-   failed documents
-   overdue tasks

The final metric set can be reduced if time is constrained.

## 17.2 Freshness

Dashboard values must be derived from current database state.

After a pipeline change:

``` text
Lead updated
   |
   +--> dashboard data changes
   |
   +--> realtime event
```

The frontend should invalidate/refetch relevant dashboard queries or
update the affected counters from the event.

## 17.3 Performance

Indexes should support the most frequent dashboard queries.

Potential indexes include:

``` text
{ brokerageId: 1, pipelineStageId: 1 }
{ brokerageId: 1, assignedAdvisorId: 1 }
{ brokerageId: 1, status: 1 }
```

The exact indexes should be verified using actual query patterns.

------------------------------------------------------------------------

# 18. API Design

## Authentication

``` text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

## Users

``` text
GET    /api/users
POST   /api/users
GET    /api/users/:id
PATCH  /api/users/:id
```

## Leads

``` text
GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
POST   /api/leads/:id/convert
```

## Pipeline

``` text
GET   /api/pipeline/stages
POST  /api/pipeline/stages
PATCH /api/pipeline/stages/:id
POST  /api/leads/:id/stage
```

## Documents

``` text
POST /api/documents/upload
GET  /api/documents
GET  /api/documents/:id
POST /api/documents/:id/retry
```

## Clients

``` text
GET /api/clients
GET /api/clients/:id
```

## Tasks

``` text
GET   /api/tasks
POST  /api/tasks
PATCH /api/tasks/:id
```

## Email Templates

``` text
GET   /api/email-templates
POST  /api/email-templates
PATCH /api/email-templates/:id
DELETE /api/email-templates/:id
```

## Webhooks

``` text
POST /api/webhooks/leads/:integrationKey
```

The exact endpoint naming can change during implementation.

------------------------------------------------------------------------

# 19. Background Jobs

BullMQ queues are proposed.

## Lead automation queue

``` text
lead-automation
```

Jobs:

``` text
send-stage-email
create-stage-tasks
```

## Document queue

``` text
document-processing
```

Jobs:

``` text
check-document
```

## Email queue

``` text
email
```

Jobs:

``` text
send-email
```

The implementation may combine queues if that produces a simpler and
more reliable system.

------------------------------------------------------------------------

# 20. Failure and Edge-Case Strategy

## Duplicate webhook

Expected behavior:

``` text
Same external lead
      |
      v
same idempotency key
      |
      v
do not create duplicate lead
```

## Worker crash

Jobs remain recoverable through the queue.

## Email provider failure

Lead stage update succeeds independently.

Email is retried asynchronously.

## Two advisors update simultaneously

Use optimistic concurrency/version checking.

## Cross-tenant ID guessing

All database access is tenant scoped.

## Client disconnects

Uploads and processing continue server-side.

Client retrieves current state after reconnecting.

## One brokerage creates heavy load

Queue-based processing and controlled worker concurrency prevent
background workloads from directly blocking the API.

## Failed document

Only the affected document fails.

Other document jobs continue.

## Duplicate client conversion

Conversion is idempotent.

------------------------------------------------------------------------

# 21. Security Requirements

-   Passwords must be hashed.
-   JWTs must be validated server-side.
-   Role checks must happen server-side.
-   Tenant isolation must be enforced server-side.
-   External webhook requests must be authenticated.
-   File metadata must be validated.
-   File access must be authorized.
-   Clients can only access their own documents.
-   Brokerage users can only access their brokerage's records.
-   Sensitive configuration must be stored in environment variables.
-   Secrets must never be committed.
-   API endpoints should validate input.
-   Rate limiting should be considered for public webhook/auth
    endpoints.
-   Errors should not expose sensitive implementation details.

------------------------------------------------------------------------

# 22. Testing Strategy

## Unit tests

Focus on business-critical logic:

-   duplicate detection
-   tenant scoping
-   authorization
-   pipeline transition rules
-   template rendering
-   document status transitions
-   task due-date calculation
-   idempotent conversion

## Integration tests

Test:

-   login
-   lead creation
-   webhook ingestion
-   tenant isolation
-   lead conversion
-   document processing
-   email/task triggers

## Critical security test

``` text
Brokerage A
    |
    | GET /leads/{brokerage-B-lead}
    v
Expected: denied
```

## Queue test

Verify that:

``` text
document upload
    !=
document verification
```

and that the upload response does not wait for the checker.

## End-to-end scenarios

### Scenario 1

External lead → pipeline → advisor → stage change.

### Scenario 2

Duplicate external lead → existing person detected.

### Scenario 3

Lead → client → client login → document upload → background
verification.

### Scenario 4

Stage change → email job + task creation.

### Scenario 5

Two browser sessions observe the same lead stage change.

------------------------------------------------------------------------

# 23. Observability

The application should have structured server logs for important events.

Examples:

``` text
lead.created
lead.duplicate_detected
lead.stage_changed
document.uploaded
document.processing_started
document.processing_failed
document.verified
email.queued
email.failed
task.created
```

Logs should contain safe identifiers useful for debugging without
exposing unnecessary sensitive data.

------------------------------------------------------------------------

# 24. Project Structure

Proposed monorepo structure:

``` text
leadflow/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── sockets/
│   │   └── types/
│   └── ...
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── brokerages/
│   │   │   ├── leads/
│   │   │   ├── clients/
│   │   │   ├── documents/
│   │   │   ├── pipeline/
│   │   │   ├── tasks/
│   │   │   ├── email/
│   │   │   └── dashboard/
│   │   ├── queues/
│   │   ├── sockets/
│   │   ├── utils/
│   │   └── app.ts
│   └── ...
│
├── worker/
│   ├── src/
│   │   ├── processors/
│   │   ├── queues/
│   │   └── index.ts
│   └── ...
│
├── docs/
├── PROMPTS.md
├── PRODUCT.md
├── README.md
├── .env.example
├── docker-compose.yml
└── package.json
```

This structure is a proposal, not a requirement of the assignment.

------------------------------------------------------------------------

# 25. UI Screens

## Platform Admin

-   Login
-   Brokerage list
-   Brokerage details
-   User management

## Brokerage Admin

-   Dashboard
-   Pipeline
-   Leads
-   Clients
-   Tasks
-   Email Templates
-   Pipeline Configuration
-   Task Automation Configuration
-   Team

## Advisor

-   Dashboard
-   Pipeline
-   Lead details
-   Client details
-   Tasks
-   Documents

## Client

-   Login
-   Case overview
-   Document upload
-   Document status
-   Failed document retry

------------------------------------------------------------------------

# 26. UX Principles

-   Never make users wait for background processing.
-   Show clear loading states.
-   Show processing states explicitly.
-   Show failures with actionable information.
-   Avoid full-page refreshes for pipeline changes.
-   Preserve the user's work when realtime reconnection occurs.
-   Make overdue tasks visually obvious.
-   Make authorization boundaries invisible to normal users but strict
    on the server.
-   Keep the client document-upload workflow simple.

------------------------------------------------------------------------

# 27. MVP Prioritization

## P0 --- Must work

-   Authentication
-   RBAC
-   Multi-tenancy
-   Leads
-   Pipeline
-   External webhook ingestion
-   Duplicate detection
-   Realtime pipeline updates
-   Lead-to-client conversion
-   Client login
-   Document upload
-   Background document processing
-   Document realtime status
-   Basic dashboard
-   Git history
-   Deployment/demo
-   PROMPTS.md
-   Final summary

## P1 --- Important

-   Email templates
-   Stage-triggered email jobs
-   Task templates
-   Stage-triggered tasks
-   Retry handling
-   Optimistic concurrency
-   Better error states

## P2 --- Can be reduced/cut if time is limited

-   Advanced platform administration
-   Complex pipeline customization
-   Sophisticated email editor
-   Advanced reporting
-   Complex file previewing
-   Advanced analytics
-   Highly granular permissions beyond the required roles
-   Production-grade document OCR/AI verification

If a P1/P2 feature is cut, document the decision in the final summary.

------------------------------------------------------------------------

# 28. What Will Not Be Built

The assignment explicitly permits cutting functionality.

Unless time permits, this MVP will not attempt to build:

-   Real mortgage underwriting
-   Real document OCR/identity verification
-   Actual banking integrations
-   Real mortgage-bank submission workflows
-   Complex marketing automation
-   Full email campaign management
-   Enterprise analytics
-   Microservice decomposition
-   Kubernetes infrastructure
-   A full external CRM integration ecosystem

The fake document checker is intentional because the assignment
explicitly allows the checking itself to be simulated.

------------------------------------------------------------------------

# 29. Git and Development Workflow

The repository should preserve a clean, understandable development
history.

## Branching strategy

Use feature branches for meaningful features:

``` text
main
├── feat/auth-rbac
├── feat/multi-tenancy
├── feat/lead-management
├── feat/lead-webhook
├── feat/realtime-pipeline
├── feat/document-processing
├── feat/email-automation
├── feat/task-automation
└── test/e2e-flows
```

Do not create branches for tiny UI changes.

## Commit strategy

Use logical commits.

Examples:

``` text
feat: add user authentication
feat: add JWT authorization middleware
feat: add brokerage tenant scoping
feat: add lead pipeline
feat: add external lead webhook
fix: make lead webhook idempotent
test: add tenant isolation tests
feat: add asynchronous document processing
fix: retry failed document jobs
feat: add stage email automation
feat: add stage task automation
```

Avoid:

``` text
final
final2
final-final
fix stuff
changes
done
```

## Main branch

`main` should remain deployable and reasonably stable.

------------------------------------------------------------------------

# 30. AI Usage and PROMPTS.md

The assignment requires every AI prompt used during development to be
preserved.

`PROMPTS.md` must therefore contain:

-   prompts in chronological order
-   original wording
-   prompts that failed
-   prompts that succeeded
-   no rewriting of the original prompts

Recommended format:

``` markdown
# AI Development Prompts

## Prompt 001

Date:
Tool:

<exact prompt>

## Prompt 002

Date:
Tool:

<exact prompt>
```

Do not reconstruct the file from memory at the end.

Maintain it during development.

------------------------------------------------------------------------

# 31. Environment Configuration

Example:

``` text
NODE_ENV=
PORT=

MONGODB_URI=

JWT_SECRET=

REDIS_URL=

STORAGE_ENDPOINT=
STORAGE_BUCKET=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=

CLIENT_URL=
```

`.env` must never be committed.

`.env.example` should be committed.

------------------------------------------------------------------------

# 32. Deployment

The deployment target should support:

``` text
Frontend
Backend API
Worker
MongoDB
Redis
Object Storage
```

The exact providers are implementation decisions based on available free
tiers.

The deployment should expose enough functionality for the reviewer to
test:

-   Platform Admin
-   Brokerage Admin
-   Advisor
-   Client

If full deployment is not practical, the assignment permits a 10--15
minute voice-over recording demonstrating the product.

------------------------------------------------------------------------

# 33. Seed/Test Data

The deployed/demo environment should contain at least:

``` text
2 brokerages
```

This is important for demonstrating tenant isolation.

Example:

``` text
Brokerage A
├── Brokerage Admin
├── Advisor A
├── Lead A
└── Client A

Brokerage B
├── Brokerage Admin
├── Advisor B
├── Lead B
└── Client B
```

Test accounts for all four roles should be documented.

------------------------------------------------------------------------

# 34. Definition of Done

A feature is considered complete only when:

-   implementation exists
-   API behavior is validated
-   authorization is checked
-   tenant isolation is preserved
-   relevant error cases are handled
-   UI has loading/error/success states
-   realtime behavior works where applicable
-   tests exist for critical business logic
-   code is committed with a meaningful message
-   feature is tested before merging to `main`

------------------------------------------------------------------------

# 35. Final Acceptance Checklist

## Authentication

-   [ ] Login works
-   [ ] Invalid credentials fail
-   [ ] JWT/session validation works
-   [ ] Role restrictions work

## Multi-tenancy

-   [ ] Two brokerages exist
-   [ ] Brokerage A cannot access Brokerage B data
-   [ ] ID guessing cannot bypass tenant isolation
-   [ ] Socket rooms are tenant scoped

## Leads

-   [ ] Lead can be created
-   [ ] External webhook works
-   [ ] Duplicate leads are handled
-   [ ] Advisor assignment works
-   [ ] Lead stage can change

## Realtime

-   [ ] Two browser sessions receive pipeline updates
-   [ ] Reconnection reconciles current state

## Clients

-   [ ] Lead can become client
-   [ ] Duplicate conversion is prevented
-   [ ] Client can log in
-   [ ] Client sees own case

## Documents

-   [ ] Client uploads documents
-   [ ] Upload does not wait for verification
-   [ ] Status begins as PENDING
-   [ ] Worker processes asynchronously
-   [ ] Processing can succeed
-   [ ] Processing can fail
-   [ ] Retry works if implemented
-   [ ] Client receives live status
-   [ ] Advisor receives live status

## Automation

-   [ ] Email template can be created
-   [ ] Placeholders render
-   [ ] Stage email trigger works
-   [ ] Task template can be configured
-   [ ] Stage task trigger works
-   [ ] Overdue tasks are visible

## Dashboard

-   [ ] Pipeline counts load
-   [ ] Counts update after relevant changes
-   [ ] Queries are tenant scoped

## Submission

-   [ ] GitHub repository is clean
-   [ ] Full commit history is present
-   [ ] Deployment/test credentials exist
-   [ ] PROMPTS.md is complete
-   [ ] Final two-paragraph summary is complete
-   [ ] Known limitations are documented

------------------------------------------------------------------------

# 36. Key Engineering Decisions

The following decisions are intentional:

### Modular monolith instead of microservices

The assignment is small enough that microservices would add operational
complexity without improving the demonstration substantially.

### MongoDB

MongoDB is required by the MERN stack specified in the brief and is
suitable for the application's document-oriented entities.

### Redis + BullMQ

Background work must not block API requests. Queues also provide retry
and recovery behavior.

### Socket.IO

The pipeline and document status requirements need live updates.

### Object storage

Large files should not be treated as ordinary MongoDB application
records.

### Database as source of truth

Realtime events improve responsiveness but do not replace persistent
state.

### Tenant ID on every brokerage-owned entity

This provides a consistent basis for tenant filtering and authorization.

### Idempotency

External systems may send duplicate events and users may repeat actions.
Critical operations therefore need safe repeated execution.

### Optimistic concurrency

Two advisors may attempt to modify the same lead. The server must
prevent stale UI state from silently overwriting newer changes.

------------------------------------------------------------------------

# 37. Engineering Trade-offs

The goal is not to build the largest architecture possible.

The goal is to demonstrate:

``` text
Correctness
+
Security
+
Reliability
+
Good UX
+
Understandable architecture
```

A feature that is implemented correctly and demonstrably is more
valuable than several partially implemented features.

The assignment explicitly states that deciding what to cut is part of
the assessment.

------------------------------------------------------------------------

# 38. Future Improvements

If LeadFlow were continued beyond the assignment:

1.  Real document OCR and classification.
2.  Virus/malware scanning.
3.  More sophisticated duplicate/entity resolution.
4.  Audit logs for sensitive operations.
5.  More granular permissions.
6.  Real email delivery analytics.
7.  Workflow versioning.
8.  Advanced dashboard analytics.
9.  Better queue observability.
10. Dead-letter queue management.
11. Automated integration health checks.
12. More external lead integrations.
13. Document versioning.
14. Secure document sharing.
15. Bank submission workflow.
16. Automated compliance checks.
17. Full production monitoring and alerting.

------------------------------------------------------------------------

# 39. Product Success Criteria

LeadFlow is successful for this assignment when a reviewer can
demonstrate the following without manually inspecting the database:

``` text
External Lead
      ↓
LeadFlow receives it
      ↓
Lead appears in pipeline
      ↓
Duplicate handling works
      ↓
Advisor moves lead
      ↓
Another open screen updates live
      ↓
Advisor converts lead
      ↓
Client logs in
      ↓
Client uploads multiple documents
      ↓
Upload completes immediately
      ↓
Background worker checks documents
      ↓
Statuses change live
      ↓
Stage automation creates email/task work
      ↓
Dashboard reflects the current pipeline
```

At the same time, a reviewer must be unable to use one brokerage's
credentials to access another brokerage's data.

That end-to-end workflow is the primary product demonstration.
