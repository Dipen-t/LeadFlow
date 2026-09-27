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
