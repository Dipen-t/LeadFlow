---
description: Enforces version control, commit, and branching strategies for the workspace.
---

# Git and Version Control Workflow

When writing code or managing version control in this workspace, ALWAYS adhere strictly to the following rules derived from the product specification:

## 1. Branching Strategy
- **Feature Branches**: ALWAYS use feature branches for meaningful features (e.g., `feat/auth-rbac`, `feat/multi-tenancy`, `feat/lead-management`, `test/e2e-flows`).
- **No Tiny Branches**: DO NOT create branches for tiny UI changes or trivial fixes.
- **Main Branch**: The `main` branch must remain deployable and reasonably stable at all times.

## 2. Commit Strategy
- **Conventional Commits**: You MUST use logical, descriptive commit messages matching the conventional commits standard.
- **Good Examples**:
  - `feat: add user authentication`
  - `feat: add JWT authorization middleware`
  - `feat: add brokerage tenant scoping`
  - `fix: make lead webhook idempotent`
  - `test: add tenant isolation tests`
- **UNACCEPTABLE Commits**: DO NOT use vague or unstructured commit messages such as:
  - `final`, `final2`, `final-final`
  - `fix stuff`, `changes`, `done`

## 3. General Principles
- The repository must preserve a clean, understandable development history.
