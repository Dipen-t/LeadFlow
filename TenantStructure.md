```text
Platform
│
├── Brokerage A
│   ├── Brokerage Admin 1
│   ├── Brokerage Admin 2
│   ├── Advisor 1
│   ├── Advisor 2
│   ├── Advisor 3
│   ├── Leads
│   ├── Clients
│   ├── Documents
│   └── Tasks
│
└── Brokerage B
    ├── Brokerage Admin 1
    ├── Advisor 1
    ├── Advisor 2
    ├── Leads
    ├── Clients
    ├── Documents
    └── Tasks
```

### The important part

There is **no Admin → Advisor ownership relationship**.

Both are users belonging to the same brokerage:

```text
User
├── brokerageId
├── role: BROKERAGE_ADMIN
└── ...

User
├── brokerageId
├── role: ADVISOR
└── ...
```

So don't create something like:

```text
Advisor
└── brokerageAdminId ❌
```

Instead:

```text
Advisor
└── brokerageId ✅
```

### Permissions

I'd implement the roles roughly like this:

| Capability               | Platform Admin | Brokerage Admin |                         Advisor |   Client |
| ------------------------ | -------------: | --------------: | ------------------------------: | -------: |
| Manage brokerages        |              ✅ |               ❌ |                               ❌ |        ❌ |
| Manage brokerage admins  |              ✅ |      ❌/optional |                               ❌ |        ❌ |
| Manage advisors          |              ✅ |               ✅ |                               ❌ |        ❌ |
| View all brokerage leads |              — |               ✅ | Based on assignment/access rule |        ❌ |
| Assign/reassign leads    |              — |               ✅ |                       ❌/limited |        ❌ |
| Work leads               |              — |               ✅ |                               ✅ |        ❌ |
| Convert lead → client    |              — |               ✅ |                               ✅ |        ❌ |
| Configure pipeline       |              — |               ✅ |                               ❌ |        ❌ |
| Email templates          |              — |               ✅ |                               ❌ |        ❌ |
| Email/task triggers      |              — |               ✅ |                               ❌ |        ❌ |
| Manage own tasks         |              — |               ✅ |                               ✅ |        ❌ |
| Client's documents       |              — |               ✅ |                               ✅ | Own only |
| Upload documents         |              — |               ❌ |                               ❌ |        ✅ |

The exact permissions are still your implementation choice because the assignment explicitly says **you decide exactly what each user can do**. 

### One thing I'd change in your implementation

Since Saiganesh has now explicitly confirmed **multiple Brokerage Admins**, your database/seed data should demonstrate that.

For example:

```text
Brokerage: ABC Mortgage

Users:
├── admin1@abc.com     BROKERAGE_ADMIN
├── admin2@abc.com     BROKERAGE_ADMIN
├── advisor1@abc.com   ADVISOR
├── advisor2@abc.com   ADVISOR
└── advisor3@abc.com   ADVISOR
```

And importantly, **all five users have the same `brokerageId`**.

That makes your multi-tenancy model very clear during the demo.

Also, the lead should point to an advisor, not an admin:

```text
Lead
├── brokerageId
├── assignedAdvisorId
└── ...
```

Yes. I’d make that the rule for LeadFlow:

```text
New Lead
   ↓
Unassigned
   ↓
Brokerage Admin assigns Advisor
   ↓
Assigned Advisor works the lead
   ↓
Contacted → ... → Won / Lost
```

### RBAC behavior

**Brokerage Admin**

* Can see all leads in their brokerage.
* Can assign an unassigned lead to any advisor in the same brokerage.
* Can reassign a lead to another advisor.
* Can see which advisor currently owns each lead.

**Advisor**

* Can see leads assigned to them.
* Can work/update their assigned leads.
* **Cannot claim an unassigned lead.**
* **Cannot assign or reassign leads.**
* Should not be able to modify `assignedAdvisorId`.

**New external lead**

```json
{
  "brokerageId": "...",
  "assignedAdvisorId": null,
  "stage": "NEW"
}
```

Then the admin performs:

```text
POST /leads/:leadId/assign
{
  "advisorId": "..."
}
```

The backend should verify:

1. The lead belongs to the admin's brokerage.
2. The selected advisor belongs to the **same brokerage**.
3. The requester has `BROKERAGE_ADMIN` permission.
4. The assignment succeeds atomically.
5. A realtime update is emitted to the relevant users.

This also gives you a very clean answer if they ask during the demo: **“Who decides which advisor handles a lead?” → The Brokerage Admin.**

The assignment itself leaves the exact permission model to you, while explicitly requiring advisors to operate the pipeline and allowing you to define the four roles' capabilities.  
