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
