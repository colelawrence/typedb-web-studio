# Claude Code Plan Mode Guide

This document explains how to effectively use Claude Code's plan mode for complex features.

## When to Use Plan Mode

Use plan mode (`/plan`) when:
- The task requires architectural decisions with multiple valid approaches
- Changes touch many files or systems
- Requirements are unclear and need exploration first
- You want to review and approve the implementation strategy before code changes

**Skip plan mode** for straightforward tasks like small bug fixes or single-file changes.

## Workflow Overview

```
1. Describe Feature → 2. Claude Explores → 3. Plan Written → 4. User Approves → 5. Implementation
```

## Step 1: Describe the Initial Feature

When entering plan mode, provide:

**Good feature description:**
```
Add user authentication with session management. Users should be able to
log in, stay logged in across page refreshes, and have their session
expire after 24 hours of inactivity.
```

**What to include:**
- The core functionality needed
- User-facing behavior expectations
- Any constraints (performance, compatibility, etc.)
- Integration points with existing systems (if known)

**What NOT to include:**
- Implementation details (let Claude explore options)
- Time estimates (Claude doesn't work with timelines)

## Step 2: Claude Explores the Codebase

During planning, Claude will:
1. Search for related existing code
2. Understand current patterns and architecture
3. Identify integration points
4. Consider multiple approaches
5. Ask clarifying questions if needed

## Step 3: The Plan Document

Claude writes a plan to `.claude/plan.md` containing:

### Activity Types

Plans typically include these activity categories:

| Activity Type | Description | Example |
|--------------|-------------|---------|
| **Research** | Understanding existing code/patterns | "Examine how auth is handled in existing services" |
| **Design** | Architecture and interface decisions | "Define session storage interface" |
| **Implementation** | Writing new code | "Create SessionManager class" |
| **Integration** | Connecting to existing systems | "Wire auth into VM scope" |
| **Testing** | Writing and running tests | "Add VM tests for login flow" |
| **Migration** | Updating existing code | "Update components to use new auth" |

### Parallel vs. Sequential Work

The plan identifies dependencies:

```
PARALLEL (independent tasks):
├── Define TypeScript interfaces for Session type
├── Research existing token storage patterns
└── Create test fixtures for auth scenarios

SEQUENTIAL (gated by previous work):
├── [After interfaces] Implement SessionManager
├── [After SessionManager] Add VM methods for login/logout
└── [After VM methods] Update React components
```

**Parallel candidates:**
- Interface/type definitions
- Independent utility functions
- Test fixture creation
- Documentation drafts
- Research tasks

**Sequential (gated) work:**
- Implementation that depends on interfaces
- Integration that depends on core implementation
- Tests that depend on implementation
- Components that depend on VM methods

### Example Plan Structure

```markdown
## Feature: User Authentication

### Phase 1: Foundation (Parallel)
- [ ] Define `Session` and `AuthState` types in `src/types/auth.ts`
- [ ] Create `src/services/auth-service.ts` interface
- [ ] Add auth-related events to LiveStore schema

### Phase 2: Core Implementation (Sequential)
- [ ] Implement `AuthService` (depends on: types, interface)
- [ ] Add `auth` scope to VM (depends on: AuthService)
- [ ] Create `authState$` computed (depends on: VM scope)

### Phase 3: Integration (Sequential)
- [ ] Wire auth into app bootstrap (depends on: auth scope)
- [ ] Add login/logout actions to TopBar VM (depends on: auth scope)

### Phase 4: UI (Parallel after Phase 3)
- [ ] Create `LoginForm` component
- [ ] Create `UserMenu` component
- [ ] Update `TopBar` to show auth state

### Phase 5: Testing
- [ ] VM integration tests for auth flows
- [ ] Service tests for token handling
```

## Step 4: Review and Approve

When Claude calls `ExitPlanMode`, you'll see the plan and can:
- **Approve** - Proceed with implementation
- **Request changes** - Ask Claude to modify the plan
- **Ask questions** - Clarify any part before approving

## Step 5: Implementation

After approval, Claude:
1. Converts plan items to a todo list
2. Works through tasks systematically
3. Marks items complete as they finish
4. May launch parallel agents for independent tasks

## Tips for Effective Planning

### Be Specific About Constraints
```
"Must work with existing LiveStore schema"
"Should not require database migration"
"Needs to support offline mode"
```

### Highlight Unknowns
```
"I'm not sure if we should use JWT or session cookies"
"The existing auth code might already handle some of this"
```

### Request Parallelization
If you want maximum speed:
```
"Please identify what can be done in parallel and spawn
multiple agents where possible"
```

### Iterate on the Plan
The plan is a document - ask Claude to revise it:
```
"Move the migration step earlier"
"Add error handling to each integration point"
"Split Phase 2 into smaller tasks"
```

## Swarm Mode (Parallel Agents)

When exiting plan mode, Claude can spawn a "swarm" of parallel agents:

```
ExitPlanMode(launchSwarm: true, teammateCount: 3)
```

This is useful when:
- Multiple independent implementation tasks exist
- Tasks don't share state or depend on each other
- You want faster completion of large features

Each agent gets assigned specific plan items and works independently.
