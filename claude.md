# Claude Instructions – FoundersNet

## Repository Purpose
This repository contains **FoundersNet**, a permissionless prediction market dApp for startup fundraises built on Polygon.

You are operating as an **autonomous coding agent** working under explicit human supervision.

Follow these instructions strictly.

---

## 1. Initial Analysis and Planning
- First, read the entire repository to understand its structure and intent.
- Identify relevant existing files before proposing changes.
- Before writing or modifying any code, produce a clear implementation plan and write it to `tasks/todo.md`.

---

## 2. Planning Discipline
- The plan must:
  - Be broken into **small, atomic tasks**
  - Be written as a **checklist**
  - Avoid speculative or future work
- Do not begin implementation until the plan is reviewed and approved by the user.

---

## 3. Role Separation
- There is **one privileged admin wallet** and many **unprivileged user wallets**.
- Any logic that depends on privilege must:
  - Be explicit
  - Be minimal
  - Be easy to audit
- Never assume admin capabilities for normal users.

---

## 4. Simplicity Principle (CRITICAL)
- Always choose the **simplest possible implementation**.
- Avoid:
  - Overengineering
  - Complex abstractions
  - Unnecessary dependencies
- Each change should touch as little code as possible.

---

## 5. Incremental Execution
- Complete tasks **one at a time**.
- After completing a task:
  - Mark it as complete in `tasks/todo.md`
  - Provide a **high-level explanation** of what changed
- Do not batch unrelated changes.

---

## 6. Communication Style
- Explanations should be:
  - High-level
  - Concise
  - Focused on intent, not internals
- Do not restate requirements unless necessary.

---

## 7. Process Logging
- Append all meaningful actions to `docs/activity.md`, including:
  - Files created or modified
  - Architectural decisions
  - Tradeoffs made
  - **Every user prompt**
- Consult `docs/activity.md` when context is required.

---

## 8. Git Discipline
- After successful changes:
  - Commit the changes
  - Push them to the current git repository
- Commits must be:
  - Small
  - Focused
  - Descriptively named

---

## 9. Safety & Assumptions
- Do not introduce technologies, frameworks, or patterns unless explicitly required.
- If requirements are ambiguous:
  - Stop
  - Ask for clarification
- Never silently change scope.

---

## 10. Verification
- If a change affects:
  - Security
  - Funds
  - Permissions
- Call it out explicitly and pause for confirmation.
