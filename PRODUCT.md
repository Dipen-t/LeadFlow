# LeadFlow --- Product Specification

## 1. Product Overview

**LeadFlow** is a multi-tenant lead and document management platform for
mortgage brokerages.

The product is designed around the workflow described in the Unsquare
MERN Developer Assignment:

1.  Leads arrive from external sources.
2.  Advisors manage those leads through a pipeline.
3.  Returning/duplicate people are identified.
4.  A lead can be converted into a client.
5.  Clients log in and upload the documents required for their mortgage
    case.
6.  Documents are checked asynchronously in the background.
7.  Clients and advisors receive live status updates.
8.  Brokerage administrators configure email templates and pipeline
    automations.
9.  Pipeline changes can automatically send emails and create advisor
    tasks.
10. Brokerage dashboards provide current pipeline numbers.

The platform must support multiple brokerages from one deployment while
strictly isolating each brokerage's users, leads, clients, documents,
tasks, and configuration.

> **Source requirement:** The assignment explicitly allows the
> architecture, libraries, and trade-offs to be chosen by the developer.
> This document therefore distinguishes assignment requirements from
> implementation decisions made for this project.

------------------------------------------------------------------------

## 2. Product Goals

### Primary goals

-   Provide a working multi-tenant brokerage CRM.
-   Give advisors a clear and real-time lead pipeline.
-   Prevent duplicate lead handling.
-   Allow leads to become clients without losing case context.
-   Give clients a simple document-upload experience.
-   Process document checks asynchronously so uploads never block on
    verification.
-   Give advisors and clients live status updates.
-   Automate common actions when leads enter pipeline stages.
-   Demonstrate production-oriented engineering decisions around queues,
    retries, concurrency, tenant isolation, and failure handling.
-   Deliver a deployable product with understandable source code and Git
    history.

### Secondary goals

-   Keep the implementation small enough to complete and stabilize
    within the assignment window.
-   Prefer reliable, demonstrable functionality over a large number of
    half-finished features.
-   Make architecture and trade-offs easy to explain during review.

------------------------------------------------------------------------

## 3. Assignment Requirements

The following are direct requirements from the assignment.

### 3.1 Multi-tenancy

The application must serve multiple brokerages from one deployment.

Each brokerage must only be able to access its own:

-   users
-   leads
-   clients
-   documents

The application must prevent cross-brokerage data access, including
attempts to guess another record's ID.

### 3.2 External lead ingestion

The system must automatically receive leads from at least one real
external tool.

The implementation should expose a webhook/API integration and handle
duplicate delivery safely.

### 3.3 Live lead pipeline

Advisors need a pipeline board with stages such as:

-   New
-   Contacted
-   additional stages as configured
-   Won
-   Lost

When a lead changes stage, open screens should receive the update
without requiring a manual refresh.

### 3.4 Duplicate/person recognition

When a new lead arrives, LeadFlow should detect whether the person is
already known by the brokerage.

The duplicate check must be scoped to the brokerage.

### 3.5 Lead-to-client conversion

An advisor must be able to convert a lead into a client.

The client must then be able to:

-   log in
-   view their case
-   upload documents

### 3.6 Background document checking

Clients may upload many documents.

The upload request must not wait for document checking.

Each document must have an independent processing state and the checking
process must:

-   happen in the background
-   take noticeable time
-   sometimes fail
-   expose its status to both client and advisor

### 3.7 Dashboard

The application must provide pipeline numbers that load quickly and
remain current.

### 3.8 Email templates

A brokerage admin must be able to create and edit email templates.

Templates must support placeholders such as:

-   client name
-   advisor name

### 3.9 Pipeline email triggers

When a lead enters a pipeline stage, the email template linked to that
stage should be sent.

Example:

-   Lead enters `New`
-   configured welcome email is triggered

### 3.10 Pipeline task triggers

When a lead enters a pipeline column, configured tasks should be
created.

Each task must have:

-   title
-   assigned advisor
-   due date
-   status

Overdue tasks must be visually distinguishable.

### 3.11 User types

The application must support:

-   Platform Admin
-   Brokerage Admin
-   Advisor
-   Client

The exact permissions are intentionally left to the developer.

### 3.12 Submission requirements

The final submission must include:

-   GitHub repository with full commit history
-   deployed application with test logins for each user type, or a
    10--15 minute voice-over screen recording if deployment is not
    provided
-   all AI prompts used during development, in order and unedited, in
    `PROMPTS.md` or equivalent exported format
-   a two-paragraph summary describing the implementation/key decisions
    and missing or weak areas/future work

------------------------------------------------------------------------

# 4. Target Users and Roles

## 4.1 Platform Admin

Platform-level operator.

Proposed responsibilities:

-   create/manage brokerages
-   view brokerage-level operational information
-   create/manage brokerage admin accounts
-   access platform-level configuration where required

Platform Admin must not be required for normal brokerage workflows.

## 4.2 Brokerage Admin

Owns configuration and operations for one brokerage.

Proposed responsibilities:

-   manage brokerage advisors
-   view/manage brokerage leads and clients
-   configure pipeline stages
-   configure email templates
-   link email templates to pipeline stages
-   configure task templates for pipeline stages
-   view dashboard
-   review document processing status

## 4.3 Advisor

Works with leads and clients belonging to their brokerage.

Proposed responsibilities:

-   view assigned/available leads according to brokerage rules
-   move leads through pipeline stages
-   convert leads into clients
-   view client cases
-   view document statuses
-   manage assigned tasks
-   update task status
-   receive real-time updates

## 4.4 Client

Restricted to their own case and documents.

Proposed responsibilities:

-   log in
-   view own case information
-   upload documents
-   view document processing status
-   retry failed documents where permitted

A client must never be able to access another client's records.

------------------------------------------------------------------------

# 5. Product Scope

## 5.1 MVP Scope

The MVP will prioritize these flows:

### Flow A --- Lead ingestion

External source → webhook → validation → tenant resolution → duplicate
detection → lead creation/update → pipeline placement → realtime
notification → stage automations

### Flow B --- Advisor pipeline

Advisor login → pipeline board → view lead → move lead → server
validates transition → database update → automation triggers → Socket.IO
broadcast

### Flow C --- Lead conversion

Lead → advisor selects Convert to Client → client record created →
client account created/invitation generated → lead linked to client →
client can log in

### Flow D --- Document processing

Client → selects document → upload → document record created as
`PENDING` → background job queued → API responds immediately → worker
changes status to `PROCESSING` → fake validation/check → `VERIFIED` or
`FAILED` → database updated → realtime event sent to client/advisor

### Flow E --- Brokerage automation

Brokerage Admin → creates email template → uses placeholders → links
template to pipeline stage

Brokerage Admin → configures task template → selects assignee/due-date
rules

Lead → enters configured stage → email job created → task created

------------------------------------------------------------------------

# 6. Explicitly Recommended Architecture

## 6.1 Architecture Style

A modular monolith with a separate background worker is recommended for
the assignment.

This avoids unnecessary distributed-system complexity while still
demonstrating the important production patterns requested by the brief.

``` text
React Client
     |
     | REST + Socket.IO
     v
Express API
     |
     +------------------+
     |                  |
     v                  v
MongoDB              Redis
                         |
                       BullMQ
                         |
                         v
                  Background Worker
                         |
                         v
                    MongoDB / Email
```

File storage is handled separately from the application database.

``` text
React
  |
  | request upload
  v
API
  |
  | upload URL / controlled upload
  v
Object Storage
  |
  v
Document record in MongoDB
  |
  v
BullMQ document-check job
```

## 6.2 Proposed technology stack

### Frontend

-   React
-   TypeScript
-   React Router
-   TanStack Query or equivalent server-state library
-   Socket.IO client
-   UI component library or Tailwind-based components

### Backend

-   Node.js
-   Express
-   TypeScript
-   MongoDB
-   Mongoose or MongoDB driver
-   JWT authentication
-   Socket.IO

### Background processing

-   Redis
-   BullMQ
-   Dedicated worker process

### File storage

Use an object-storage provider with a free tier.

The exact provider is an implementation decision.

### Email

Use an email provider with a free tier where practical.

For local development, an email preview/test provider may be used.

------------------------------------------------------------------------

# 7. Multi-Tenant Data Isolation

## 7.1 Tenant model

Every brokerage-owned record must carry a `brokerageId`.

Example:

``` text
Brokerage
  |
  +-- Users
  +-- Leads
  +-- Clients
  +-- Documents
  +-- Tasks
  +-- Email Templates
  +-- Pipeline Stages
```

## 7.2 Tenant resolution

For authenticated users:

``` text
JWT
 |
 +-- userId
 +-- role
 +-- brokerageId
```

For external webhooks:

``` text
Webhook endpoint
 |
 +-- integration identifier / secret
 +-- resolve brokerage
```

The API must not trust a client-supplied `brokerageId` as the source of
authorization.

The server derives the tenant from authenticated context or the
validated integration.

## 7.3 Mandatory tenant filtering

Every brokerage-owned query must include tenant scope.

Example conceptually:

``` text
find lead
WHERE
  lead.id = requestedId
  AND lead.brokerageId = authenticatedUser.brokerageId
```

This applies to:

-   reads
-   updates
-   deletes
-   task operations
-   documents
-   clients
-   templates
-   pipeline stages

## 7.4 Cross-tenant access test

An explicit automated test must verify:

``` text
Brokerage A user
    |
    | request Brokerage B lead ID
    v
403 / 404
```

The implementation should not leak whether the foreign record exists.

------------------------------------------------------------------------

# 8. Authentication and Authorization

## 8.1 Authentication

JWT-based authentication is proposed.

The frontend stores authentication state according to the chosen
security approach.

The backend validates:

-   token
-   user identity
-   role
-   brokerage membership
-   account status

## 8.2 Authorization

Authorization should be enforced server-side.

Example:

  Capability                      Platform Admin   Brokerage Admin   Advisor     Client
  ----------------------------- ---------------- ----------------- --------- ----------
  Manage brokerages                          Yes                No        No         No
  Manage brokerage users               No/Scoped               Yes        No         No
  View brokerage leads                    Scoped               Yes       Yes         No
  Move leads                           No/Scoped               Yes       Yes         No
  Convert lead                         No/Scoped               Yes       Yes         No
  Configure templates                         No               Yes        No         No
  Configure stage automations                 No               Yes        No         No
  View dashboard                      Yes/Scoped               Yes    Scoped         No
  View client case                        Scoped               Yes       Yes   Own case
  Upload documents                            No                No        No   Own case
  View document status                    Scoped               Yes       Yes   Own case

The final permission matrix may be adjusted during implementation.

------------------------------------------------------------------------

# 9. Core Data Model

## 9.1 Brokerage

``` text
Brokerage
- _id
- name
- slug
- status
- createdAt
- updatedAt
```

## 9.2 User

``` text
User
- _id
- brokerageId
- role
- name
- email
- passwordHash
- status
- createdAt
- updatedAt
```

`brokerageId` is nullable only for platform-level users if required by
the final design.

## 9.3 Lead

``` text
Lead
- _id
- brokerageId
- firstName
- lastName
- email
- phone
- source
- externalId
- duplicateOf
- assignedAdvisorId
- pipelineStageId
- status
- createdAt
- updatedAt
```

Recommended unique/idempotency strategy:

``` text
brokerageId + source + externalId
```

where the external integration supplies a stable identifier.

## 9.4 Client

``` text
Client
- _id
- brokerageId
- leadId
- userId
- firstName
- lastName
- email
- phone
- createdAt
- updatedAt
```

## 9.5 Document

``` text
Document
- _id
- brokerageId
- clientId
- uploadedBy
- originalName
- storageKey
- mimeType
- size
- status
- failureReason
- processingAttempts
- uploadedAt
- processingStartedAt
- processedAt
- createdAt
- updatedAt
```

Suggested statuses:

``` text
PENDING
PROCESSING
VERIFIED
FAILED
```

## 9.6 Pipeline Stage

``` text
PipelineStage
- _id
- brokerageId
- name
- order
- category
- emailTemplateId
- createdAt
- updatedAt
```

`category` can distinguish terminal states such as `WON` and `LOST`.

## 9.7 Email Template

``` text
EmailTemplate
- _id
- brokerageId
- name
- subject
- body
- variables
- active
- createdAt
- updatedAt
```

Example variables:

``` text
{{clientName}}
{{advisorName}}
{{leadName}}
{{brokerageName}}
```

## 9.8 Task Template

``` text
TaskTemplate
- _id
- brokerageId
- pipelineStageId
- title
- description
- dueInMinutes
- assignmentRule
- active
- createdAt
- updatedAt
```

## 9.9 Task

``` text
Task
- _id
- brokerageId
- leadId
- assignedAdvisorId
- title
- description
- dueAt
- status
- createdAt
- completedAt
- updatedAt
```

Suggested statuses:

``` text
TODO
IN_PROGRESS
COMPLETED
CANCELLED
```

## 9.10 Integration

``` text
Integration
- _id
- brokerageId
- type
- name
- secretHash / configuration
- active
- createdAt
- updatedAt
```

This allows external lead sources to be associated with a brokerage.

------------------------------------------------------------------------

# 10. Lead Ingestion

## 10.1 Webhook flow

``` text
External Tool
    |
    | POST webhook
    v
Express
    |
    +-- authenticate webhook
    +-- resolve brokerage
    +-- validate payload
    +-- normalize fields
    +-- calculate idempotency key
    |
    v
MongoDB
    |
    +-- duplicate/existing lead?
    |
    +-- no -> create
    +-- yes -> safely handle duplicate
    |
    v
Queue automation jobs
    |
    v
Socket.IO event
```

## 10.2 Duplicate handling

Possible duplicate signals:

-   external source ID
-   normalized email
-   normalized phone

The strongest duplicate identifier is a stable external ID from the
source.

For email/phone matching:

-   normalize before comparison
-   scope searches to `brokerageId`
-   avoid treating a weak match as a guaranteed duplicate without
    documenting the rule

## 10.3 Burst handling

The webhook endpoint should acknowledge requests quickly.

Heavy work should be queued.

``` text
500 incoming leads
       |
       v
Webhook API
       |
       v
Queue
       |
       +--> worker
       +--> worker
       +--> worker
```

Rate limiting and queue concurrency can be used to prevent one workload
from overwhelming the API.

------------------------------------------------------------------------

# 11. Lead Pipeline

## 11.1 Pipeline model

The initial default stages can be:

``` text
NEW
CONTACTED
QUALIFIED
APPLICATION
WON
LOST
```

The exact intermediate stages can remain configurable.

## 11.2 Stage transition

``` text
Advisor moves card
       |
       v
API validates permission
       |
       v
Validate current version/state
       |
       v
Update lead stage
       |
       +----> create email job if configured
       |
       +----> create task(s) if configured
       |
       +----> emit realtime event
```

## 11.3 Concurrent updates

Two advisors may attempt to modify the same lead.

The backend must not blindly trust the UI state.

Recommended approach:

-   include a version or `updatedAt` value in the update request
-   perform a conditional update
-   reject stale updates
-   return the current server state

Conceptually:

``` text
UPDATE lead
SET stage = NEW_STAGE
WHERE id = LEAD_ID
AND version = CLIENT_VERSION
```

If no record is modified:

``` text
409 Conflict
```

The frontend then refreshes/reconciles the lead.

------------------------------------------------------------------------

# 12. Real-Time Updates

Socket.IO is proposed.

## 12.1 Events

Example events:

``` text
lead.created
lead.updated
lead.stageChanged
task.created
task.updated
document.processing
document.verified
document.failed
dashboard.updated
```

## 12.2 Tenant-scoped rooms

Clients should join rooms based on authorized tenant context.

Example:

``` text
brokerage:{brokerageId}
```

Client-specific rooms may also be used:

``` text
client:{clientId}
```

The server must never allow a socket to join an arbitrary brokerage room
supplied by the client.

## 12.3 Reconnection

Socket.IO reconnection is not treated as a substitute for database
consistency.

After reconnect:

``` text
Socket reconnect
    |
    v
Fetch current server state
    |
    v
Reconcile UI
```

The database remains the source of truth.

------------------------------------------------------------------------

# 13. Client Conversion

## 13.1 Conversion flow

``` text
Lead
 |
 | Convert
 v
Validate lead
 |
 +-- already converted? -> return existing client
 |
 v
Create Client
 |
 v
Create / invite Client User
 |
 v
Link Lead -> Client
 |
 v
Notify advisor
```

The conversion operation should be idempotent.

If an advisor clicks Convert twice, the system must not create two
clients.

------------------------------------------------------------------------

# 14. Document Upload and Processing

## 14.1 Core principle

Uploading and checking are separate operations.

The client must never wait for the background checker.

``` text
Client
 |
 | upload
 v
Storage
 |
 v
Document = PENDING
 |
 v
BullMQ job
 |
 v
HTTP 202 / successful upload response
```

Then independently:

``` text
BullMQ
  |
  v
Worker
  |
  v
PROCESSING
  |
  | simulated slow check
  |
  +--> VERIFIED
  |
  +--> FAILED
```

## 14.2 Independent jobs

Each document receives its own job.

For 40 documents:

``` text
check-document-1
check-document-2
check-document-3
...
check-document-40
```

A failed document must not block other documents.

## 14.3 Retry behavior

Background jobs should support retries.

Example policy:

``` text
attempt 1
   ↓
failure
   ↓
backoff
   ↓
attempt 2
   ↓
failure
   ↓
attempt 3
   ↓
FAILED
```

The exact retry count and delay are implementation decisions.

## 14.4 Simulated checker

The assignment permits the actual checking logic to be faked.

The implementation will simulate:

-   processing delay
-   successful verification
-   occasional failures

The simulation should still update real persistent state and generate
real realtime events.

## 14.5 Client UX

The upload screen should remain usable while processing.

Example:

``` text
Passport.pdf          VERIFIED
Payslip-March.pdf     PROCESSING
BankStatement.pdf     FAILED
Employment.pdf        PENDING
```

The client can leave the page and return later.

------------------------------------------------------------------------

# 15. Email Automation

## 15.1 Template system

Templates contain:

-   subject
-   body
-   supported placeholders

Example:

``` text
Subject:
Welcome {{clientName}}

Body:
Hello {{clientName}},
Your advisor is {{advisorName}}.
```

## 15.2 Template rendering

The backend should render placeholders from trusted server-side data.

The client should not be able to inject arbitrary template variables
that expose unauthorized information.

## 15.3 Pipeline trigger

``` text
Lead enters stage
       |
       v
Find configured template
       |
       v
Create email job
       |
       v
Email worker
       |
       v
Provider
```

Email sending should be asynchronous so that a provider outage does not
block the lead-stage update.

## 15.4 Provider failure

If email delivery fails:

-   preserve the lead stage change
-   retain the email job/error state
-   retry where appropriate
-   log the failure
-   avoid duplicating the business operation

------------------------------------------------------------------------

# 16. Task Automation

## 16.1 Configuration

A brokerage admin configures task templates per stage.

Example:

``` text
Stage: NEW

Task:
"Call within 2 hours"

Due:
2 hours after stage entry

Assigned:
Lead's assigned advisor
```

## 16.2 Trigger

``` text
Lead enters NEW
      |
      v
Load task templates
      |
      v
Create task instances
      |
      v
Advisor sees task
```

## 16.3 Overdue tasks

A task is overdue when:

``` text
now > dueAt
AND status != COMPLETED
```

The frontend must visually distinguish overdue tasks.

The server remains the source of truth.

------------------------------------------------------------------------

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
