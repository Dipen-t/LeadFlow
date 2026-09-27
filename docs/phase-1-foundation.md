# 1. Product Overview

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
