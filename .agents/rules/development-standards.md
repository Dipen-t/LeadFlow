---
description: Enforces testing requirements and project file structure for the workspace.
---

# Development Standards

When developing features in this workspace, you MUST adhere to the following standards:

## 1. Test-Driven Progression
- **Do not move ahead without testing**: Before proceeding to the next feature, stage, or phase, you must write appropriate tests (unit, integration, or end-to-end) and verify that the functionality works correctly.
- Always validate that changes meet the acceptance criteria and do not break existing functionality.

## 2. Project File Structure
You must follow the modular monolith repository structure outlined below for all development:

```text
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

Ensure new modules and files are placed in their appropriate directories within this structure.
