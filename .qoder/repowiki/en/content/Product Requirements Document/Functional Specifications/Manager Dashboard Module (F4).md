# Manager Dashboard Module (F4)

<cite>
**Referenced Files in This Document**
- [page.tsx](file://web/app/manager/dashboard/page.tsx)
- [actions.ts](file://web/app/manager/dashboard/actions.ts)
- [decide-controls.tsx](file://web/app/manager/dashboard/decide-controls.tsx)
- [draft-page.tsx](file://web/app/manager/draft/page.tsx)
- [draft-controls.tsx](file://web/app/manager/draft/draft-controls.tsx)
- [draft-actions.ts](file://web/app/manager/draft/actions.ts)
- [draft-tabs.tsx](file://web/app/manager/draft/draft-tabs.tsx)
- [dashboard.controller.ts](file://api/src/request/dashboard.controller.ts)
- [dashboard.service.ts](file://api/src/request/dashboard.service.ts)
- [schedule-controller.ts](file://api/src/schedule/schedule.controller.ts)
- [schedule-service.ts](file://api/src/schedule/schedule.service.ts)
- [conflicts.ts](file://api/src/request/conflicts.ts)
- [probation.ts](file://api/src/employee/probation.ts)
- [api.ts](file://web/lib/api.ts)
- [dashboard.api-spec.ts](file://api/test/dashboard.api-spec.ts)
- [conflicts.spec.ts](file://api/src/request/conflicts.spec.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive Manager Draft Interface (F5) documentation with generate button functionality
- Documented per-day edit cards with source information display system
- Added middle shift restrictions and validation logic documentation
- Updated critical fix for server value display in draft cells
- Enhanced integration between dashboard and draft interfaces
- Added complete API endpoints for draft management operations

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Manager Dashboard Interface (F4)](#manager-dashboard-interface-f4)
6. [Manager Draft Interface (F5)](#manager-draft-interface-f5)
7. [Detailed Component Analysis](#detailed-component-analysis)
8. [Conflict Detection Engine](#conflict-detection-engine)
9. [REST API Endpoints](#rest-api-endpoints)
10. [React Server Actions](#react-server-actions)
11. [Probation Staff Handling](#probation-staff-handling)
12. [Test Coverage](#test-coverage)
13. [Performance Considerations](#performance-considerations)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Conclusion](#conclusion)

## Introduction
This document defines the functional specifications for the Manager Dashboard module (F4) within the Kyne Shift Scheduling application. The dashboard is the manager's single screen to review all upcoming-week requests, identify conflicts, and prepare for schedule drafting. It must clearly show pending approvals with priority indicators, highlight scheduling conflicts, and provide filtering by request type, date range, and employee.

The project now includes a complete implementation with conflict detection engine ('bentrok' logic), REST API endpoints (/dashboard/requests), React Server Actions for decision workflow, probation staff handling improvements, comprehensive test coverage across 16 files with ~1,886 lines of new code, and an enhanced Manager Draft Interface (F5) with generate button, per-day edit cards, source information display, and middle shift restrictions.

**Section sources**
- [page.tsx:105-112](file://web/app/manager/dashboard/page.tsx#L105-L112)
- [dashboard.controller.ts:19-25](file://api/src/request/dashboard.controller.ts#L19-L25)
- [draft-page.tsx:123-130](file://web/app/manager/draft/page.tsx#L123-L130)

## Project Structure
The repository now contains a complete implementation of both the Manager Dashboard (F4) and Manager Draft Interface (F5) with Next.js frontend components and NestJS backend services.

```mermaid
graph TB
subgraph "Frontend (Next.js)"
FE_Dashboard["Manager Dashboard Page (F4)"]
FE_Draft["Manager Draft Page (F5)"]
FE_Actions["React Server Actions"]
FE_Controls["Decision Controls"]
FE_API["API Client"]
end
subgraph "Backend (NestJS)"
BE_Controller["Dashboard Controller"]
BE_ScheduleController["Schedule Controller"]
BE_Service["Dashboard Service"]
BE_ScheduleService["Schedule Service"]
BE_Conflicts["Conflict Detection"]
BE_Probation["Probation Logic"]
end
subgraph "Data Layer"
DB["PostgreSQL (Supabase)"]
PRISMA["Prisma ORM"]
end
FE_Dashboard --> FE_API
FE_Draft --> FE_API
FE_Actions --> BE_Controller
FE_Actions --> BE_ScheduleController
FE_Controls --> FE_Actions
BE_Controller --> BE_Service
BE_ScheduleController --> BE_ScheduleService
BE_Service --> BE_Conflicts
BE_Service --> DB
BE_ScheduleService --> DB
PRISMA --> DB
```

**Diagram sources**
- [page.tsx:113-147](file://web/app/manager/dashboard/page.tsx#L113-L147)
- [draft-page.tsx:131-198](file://web/app/manager/draft/page.tsx#L131-L198)
- [dashboard.controller.ts:23-31](file://api/src/request/dashboard.controller.ts#L23-L31)
- [schedule-controller.ts:27-99](file://api/src/schedule/schedule.controller.ts#L27-L99)

**Section sources**
- [page.tsx:1-300](file://web/app/manager/dashboard/page.tsx#L1-L300)
- [draft-page.tsx:1-495](file://web/app/manager/draft/page.tsx#L1-L495)
- [dashboard.controller.ts:1-59](file://api/src/request/dashboard.controller.ts#L1-L59)
- [schedule-controller.ts:1-100](file://api/src/schedule/schedule.controller.ts#L1-L100)

## Core Components
The Manager Dashboard (F4) provides:
- Request overview showing all pending approval items for the upcoming week with real-time updates.
- Conflict highlighting for leave and shift requests that exceed allowed slots or violate business rules using the 'bentrok' detection engine.
- Pending request lists with filters by type, date range, and employee.
- Visual priority indicators to help managers triage urgent or problematic requests.
- React Server Actions for secure decision-making workflows.

The Manager Draft Interface (F5) provides:
- Generate button to create drafts from previous week data.
- Per-day edit cards with immediate save functionality.
- Source information display showing assignment origins (copy, request, auto_middle, manual).
- Middle shift restrictions for kitchen staff only.
- Critical server value display fix for draft cells.

Key data entities involved:
- Employee: role, position (bar/kitchen), probation status, active status.
- Off-request: weekly leave request per employee, with status and decision metadata.
- Shift-request: weekly shift preference per employee per day, with status and decision metadata.
- Schedule week: weekly context including deadline and status.
- Draft assignment: per-day placement with source tracking and validation.

**Section sources**
- [page.tsx:54-63](file://web/app/manager/dashboard/page.tsx#L54-L63)
- [draft-page.tsx:81-91](file://web/app/manager/draft/page.tsx#L81-L91)
- [dashboard.service.ts:66-83](file://api/src/request/dashboard.service.ts#L66-L83)

## Architecture Overview
The Manager Dashboard is a client-side view that calls backend endpoints to retrieve employees eligible to request (non-probation), pending off-requests and shift-requests for the current upcoming week, and conflict detection results computed by the backend based on business rules.

```mermaid
sequenceDiagram
participant M as "Manager Browser"
participant D as "Dashboard UI (F4)"
participant G as "Draft UI (F5)"
participant A as "React Server Actions"
participant C as "Dashboard Controller"
participant SC as "Schedule Controller"
participant S as "Dashboard Service"
participant SS as "Schedule Service"
participant CF as "Conflict Detector"
participant DB as "PostgreSQL"
M->>D : Open Manager Dashboard
D->>C : GET /dashboard/requests
C->>S : requests()
S->>DB : Fetch employees, requests
DB-->>S : Data
S->>CF : detectConflicts()
CF-->>S : Conflict IDs
S-->>C : RequestsDashboard
C-->>D : JSON response
M->>G : Open Manager Draft
G->>SC : GET /schedule/draft
SC->>SS : draft()
SS->>DB : Fetch draft assignments
DB-->>SS : Assignments
SS-->>SC : DraftSchedule
SC-->>G : Draft data
G->>A : generateAction(formData)
A->>SC : POST /schedule/draft
SC->>SS : generate()
SS->>DB : Create draft from previous week
DB-->>SS : Created draft
SS-->>SC : DraftSchedule
SC-->>A : Success response
A->>G : revalidatePath()
G-->>M : Updated draft interface
```

**Diagram sources**
- [page.tsx:113-147](file://web/app/manager/dashboard/page.tsx#L113-L147)
- [draft-page.tsx:131-198](file://web/app/manager/draft/page.tsx#L131-L198)
- [dashboard.controller.ts:28-57](file://api/src/request/dashboard.controller.ts#L28-L57)
- [schedule-controller.ts:51-71](file://api/src/schedule/schedule.controller.ts#L51-L71)
- [dashboard.service.ts:37-134](file://api/src/request/dashboard.service.ts#L37-L134)
- [schedule-service.ts:71-130](file://api/src/schedule/schedule.service.ts#L71-L130)

## Manager Dashboard Interface (F4)
The original Manager Dashboard interface continues to provide comprehensive request management capabilities with enhanced integration to the new draft interface.

### Request Overview Interface
Purpose:
- Show all pending leave and shift requests for the upcoming week with real-time conflict detection.
- Indicate which requests are still open for change before the weekly deadline.
- Provide quick access to details for each request with visual conflict indicators.

UI elements:
- Summary cards: total pending requests, number of conflicts, number of employees who have not requested yet.
- Priority indicators:
  - High: conflicts involving kitchen coverage or weekend coverage violations.
  - Medium: conflicts in bar positions or weekday coverage concerns.
  - Normal: valid requests awaiting decision.
- Status badges: pending, approved, rejected.
- Action buttons: approve, reject via React Server Actions.

Data model mapping:
- Off-request: employee, date, status, decided_by, decided_at.
- Shift-request: employee, date, shift_type (morning/evening), status, decided_by, decided_at.
- Employee: name, position, probation status, active flag.

Acceptance criteria:
- All pending requests for the upcoming week load within performance targets.
- Conflicts are visually highlighted with clear labels and colors using the 'bentrok' system.
- Managers can sort and filter requests by type, date, and employee.
- The interface reflects real-time updates after decisions are made through React Server Actions.

**Section sources**
- [page.tsx:149-229](file://web/app/manager/dashboard/page.tsx#L149-L229)
- [page.tsx:231-300](file://web/app/manager/dashboard/page.tsx#L231-L300)

## Manager Draft Interface (F5)
The new Manager Draft Interface provides advanced scheduling capabilities with enhanced user experience and robust validation.

### Generate Button Functionality
Purpose:
- Create draft schedules from previous week data automatically.
- Run the complete alur 4.1–4.4 process to populate the target week.
- Replace existing draft data with fresh generated content.

Implementation:
- Single button form that works before hydration for reliability.
- Uses useActionState for pending state management and success/error feedback.
- Only available on target tab (not running week) to prevent overwriting live data.
- Triggers full regeneration and database transaction for consistency.

User experience:
- Shows "Menyusun draft..." while processing.
- Displays success message "Draft dibuat dari minggu lalu." on completion.
- Automatically refreshes the page to show generated content.

**Section sources**
- [draft-controls.tsx:22-45](file://web/app/manager/draft/draft-controls.tsx#L22-L45)
- [draft-actions.ts:35-48](file://web/app/manager/draft/actions.ts#L35-L48)

### Per-Day Edit Cards
Purpose:
- Allow managers to edit individual day assignments directly.
- Provide immediate save functionality without separate submit buttons.
- Support different shift types based on employee position.

Features:
- Each staff member gets a card with seven day cells.
- Select dropdowns for shift selection (PAGI, SORE, MIDDLE for kitchen; PAGI, SORE for bar).
- Automatic form submission on select change.
- Real-time validation and error feedback.

Validation rules:
- Libur only allowed Monday-Thursday (Senin-Kamis).
- Friday-Sunday busy days require everyone to work.
- Past days on running week are locked and read-only.
- Position-specific shift availability (middle only for kitchen).

**Section sources**
- [draft-controls.tsx:104-176](file://web/app/manager/draft/draft-controls.tsx#L104-L176)
- [draft-page.tsx:282-321](file://web/app/manager/draft/page.tsx#L282-L321)

### Source Information Display
Purpose:
- Show managers where each assignment originated from.
- Provide transparency about automatic vs manual placements.
- Help managers understand the draft generation process.

Source types:
- `copy`: Assignment copied from previous week.
- `request`: Assignment based on approved employee request.
- `auto_middle`: Automatic middle shift assignment for kitchen coverage.
- `manual`: Manual edit by manager.

Display format:
- Text label below each cell showing assignment source.
- Indonesian labels for better user comprehension.
- Special handling for past days ("Sudah lewat") and empty cells ("Belum diisi").

**Section sources**
- [draft-page.tsx:81-86](file://web/app/manager/draft/page.tsx#L81-L86)
- [draft-page.tsx:307-313](file://web/app/manager/draft/page.tsx#L307-L313)

### Middle Shift Restrictions
Purpose:
- Enforce business rules for middle shift assignments.
- Ensure proper kitchen coverage during colleague absences.
- Prevent invalid middle shift configurations.

Business rules:
- Middle shift only available for kitchen staff.
- Middle shift only allowed Monday-Thursday (same as libur).
- Automatic middle assignment when kitchen peer is on leave.
- Never appears on Friday-Sunday busy days.

Implementation:
- Backend validation in schedule service edit method.
- Frontend choice filtering (kitchen-only middle option).
- Error messages for invalid middle shift attempts.

**Section sources**
- [draft-page.tsx:88-91](file://web/app/manager/draft/page.tsx#L88-L91)
- [schedule-service.ts:393-402](file://api/src/schedule/schedule.service.ts#L393-L402)

### Critical Fix for Server Value Display
Purpose:
- Ensure draft cells always display server-authoritative values.
- Fix synchronization issues between client and server state.
- Handle regeneration and refused edits gracefully.

Technical implementation:
- Uncontrolled select component with server value synchronization.
- useEffect hook to sync client select value with server state.
- Proper handling of null shift codes (libur) vs actual shift codes.
- State-aware value updates after actions complete.

Benefits:
- Prevents display of stale client-side values.
- Ensures consistency after batch operations.
- Improves reliability of draft editing workflow.

**Section sources**
- [draft-controls.tsx:119-130](file://web/app/manager/draft/draft-controls.tsx#L119-L130)

## Detailed Component Analysis

### Request Overview Interface
Purpose:
- Show all pending leave and shift requests for the upcoming week with real-time conflict detection.
- Indicate which requests are still open for change before the weekly deadline.
- Provide quick access to details for each request with visual conflict indicators.

UI elements:
- Summary cards: total pending requests, number of conflicts, number of employees who have not requested yet.
- Priority indicators:
  - High: conflicts involving kitchen coverage or weekend coverage violations.
  - Medium: conflicts in bar positions or weekday coverage concerns.
  - Normal: valid requests awaiting decision.
- Status badges: pending, approved, rejected.
- Action buttons: approve, reject via React Server Actions.

Data model mapping:
- Off-request: employee, date, status, decided_by, decided_at.
- Shift-request: employee, date, shift_type (morning/evening), status, decided_by, decided_at.
- Employee: name, position, probation status, active flag.

Acceptance criteria:
- All pending requests for the upcoming week load within performance targets.
- Conflicts are visually highlighted with clear labels and colors using the 'bentrok' system.
- Managers can sort and filter requests by type, date, and employee.
- The interface reflects real-time updates after decisions are made through React Server Actions.

**Section sources**
- [page.tsx:149-229](file://web/app/manager/dashboard/page.tsx#L149-L229)
- [page.tsx:231-300](file://web/app/manager/dashboard/page.tsx#L231-L300)

### Conflict Highlighting System
Purpose:
- Automatically detect and visually highlight conflicting requests so managers can resolve them quickly using the 'bentrok' algorithm.

Conflict types:
- Leave conflict: two employees in the same position requesting leave on the same day when the rule allows only one per position per day.
- Shift conflict: more employees requesting the same shift type on the same day than allowed slots.

Business rules applied:
- Maximum one bar leave and one kitchen leave per day.
- Weekend coverage requires minimum staffing levels; conflicts affecting weekends are high priority.
- Kitchen middle assignment logic affects shift availability; if a kitchen colleague is off, the other becomes middle, making certain shift requests invalid.

Visual behavior:
- Conflict rows are highlighted with a warning color and an icon.
- Tooltip explains the reason for the conflict and suggests resolution options.
- Filters allow focusing on conflict-only views.

Algorithm outline:
```mermaid
flowchart TD
Start(["Load pending requests"]) --> GroupByDay["Group requests by day and position"]
GroupByDay --> CheckLeave{"Leave exceeds limit?"}
CheckLeave --> |Yes| MarkLeaveConflict["Mark leave conflict"]
CheckLeave --> |No| CheckShift["Check shift requests"]
MarkLeaveConflict --> CheckShift
CheckShift --> ExceedsSlots{"Shift requests exceed allowed slots?"}
ExceedsSlots --> |Yes| MarkShiftConflict["Mark shift conflict"]
ExceedsSlots --> |No| NoConflict["No conflict"]
MarkShiftConflict --> Prioritize["Assign priority based on day and position"]
NoConflict --> Prioritize
Prioritize --> Render["Render with highlights"]
```

**Diagram sources**
- [conflicts.ts:135-144](file://api/src/request/conflicts.ts#L135-L144)
- [conflicts.ts:68-110](file://api/src/request/conflicts.ts#L68-L110)

**Section sources**
- [conflicts.ts:1-145](file://api/src/request/conflicts.ts#L1-L145)
- [page.tsx:155-157](file://web/app/manager/dashboard/page.tsx#L155-L157)

## Conflict Detection Engine
The 'bentrok' conflict detection engine is a pure function that processes request facts and returns conflict IDs without database dependencies.

Core algorithms:
- `detectConflicts()`: Main entry point that coordinates leave and shift conflict detection.
- `conflictingOffIds()`: Identifies leave conflicts where multiple employees request the same position/day.
- `conflictingShiftIds()`: Calculates shift capacity based on available staff and minimum requirements.
- `minPerShift()`: Determines minimum staff per shift (2 for bar on busy days, 1 otherwise).
- `isBusyDay()`: Identifies Friday-Sunday as busy days requiring higher staffing levels.

Key features:
- Pure functions with no side effects for reliable testing.
- Real-time conflict recalculation after each decision.
- Probation staff included in capacity calculations but excluded from request eligibility.
- Approved leaves reduce available capacity for shift requests.

**Section sources**
- [conflicts.ts:3-8](file://api/src/request/conflicts.ts#L3-L8)
- [conflicts.ts:41-58](file://api/src/request/conflicts.ts#L41-L58)
- [conflicts.ts:68-110](file://api/src/request/conflicts.ts#L68-L110)

## REST API Endpoints
The dashboard exposes RESTful endpoints for reading requests and making decisions, plus new endpoints for draft management.

### GET /dashboard/requests
Returns the complete dashboard data including requests, conflicts, and reminder lists.

Response structure:
```json
{
  "weekStartDate": "2026-11-09",
  "requestDeadline": "2026-11-08T23:59:59Z",
  "windowOpen": true,
  "offRequests": [...],
  "offConflicted": ["o1", "o2"],
  "shiftRequests": [...],
  "shiftConflicted": ["s1"],
  "staffWithoutRequest": [...]
}
```

### PATCH /dashboard/requests/off/:id
Makes a decision on an off-request.

Request body:
```json
{
  "decision": "approve" | "reject"
}
```

### PATCH /dashboard/requests/shift/:id
Makes a decision on a shift-request.

Request body:
```json
{
  "decision": "approve" | "reject"
}
```

### GET /schedule/draft
Retrieves the draft schedule for a specific week alias.

Query parameters:
- `week`: 'target' | 'running' (defaults to 'target')

### POST /schedule/draft
Generates a new draft from the previous week (target only).

### POST /schedule/publish
Publishes a schedule and opens the next request window.

Query parameters:
- `week`: 'target' | 'running'

### PUT /schedule/draft/assignment
Updates a single draft assignment cell.

Request body:
```json
{
  "employeeId": "string",
  "tanggal": "YYYY-MM-DD",
  "shiftCode": "PAGI" | "SORE" | "MIDDLE" | null,
  "week": "target" | "running"
}
```

All endpoints require appropriate role authentication and return standardized error responses.

**Section sources**
- [dashboard.controller.ts:28-57](file://api/src/request/dashboard.controller.ts#L28-L57)
- [schedule-controller.ts:51-99](file://api/src/schedule/schedule.controller.ts#L51-L99)
- [dashboard.service.ts:37-134](file://api/src/request/dashboard.service.ts#L37-L134)
- [schedule-service.ts:71-431](file://api/src/schedule/schedule.service.ts#L71-L431)

## React Server Actions
The dashboard uses React Server Actions for secure decision-making workflows with automatic form validation and state management.

### Dashboard Actions
Key features:
- Form-based submission with hidden fields for request type and ID.
- Automatic revalidation of dashboard data after successful decisions.
- Error handling with user-friendly messages in Indonesian.
- Pending state management during API calls.
- Role verification at the API layer for security.

Implementation details:
- `decideAction()`: Main server action handling form submissions.
- Input validation for request kind ('off' | 'shift') and decision ('approve' | 'reject').
- Integration with Next.js caching system for real-time updates.
- Graceful error handling with fallback messages.

### Draft Actions
New draft-related server actions:
- `generateAction()`: Creates draft from previous week data.
- `publishAction()`: Publishes schedule and opens next request window.
- `saveAssignmentAction()`: Updates individual draft assignment cells.

Features:
- Week alias support for target vs running week operations.
- Comprehensive input validation and sanitization.
- Transactional database operations for data consistency.
- Real-time path revalidation for immediate UI updates.

**Section sources**
- [actions.ts:1-56](file://web/app/manager/dashboard/actions.ts#L1-L56)
- [draft-actions.ts:1-112](file://web/app/manager/draft/actions.ts#L1-L112)
- [decide-controls.tsx:1-70](file://web/app/manager/dashboard/decide-controls.tsx#L1-L70)

## Probation Staff Handling
The system implements sophisticated probation staff handling according to ADR 0003.

Key behaviors:
- Probation staff are included in shift coverage calculations but cannot submit requests.
- Probation status is automatically advanced to 'tetap' when probation period expires.
- Probation staff count towards available capacity for shift assignments.
- Reminder list excludes probation staff since they cannot make requests.

Implementation:
- `advanceProbation()` function handles status transitions.
- Real-time probation evaluation during dashboard reads.
- Probation staff work every day (no holidays) and contribute to coverage.
- Test coverage ensures correct behavior in edge cases.

**Section sources**
- [dashboard.service.ts:66-83](file://api/src/request/dashboard.service.ts#L66-L83)
- [probation.ts:1-46](file://api/src/employee/probation.ts#L1-L46)
- [dashboard.api-spec.ts:339-380](file://api/test/dashboard.api-spec.ts#L339-L380)

## Test Coverage
Comprehensive test coverage across 16 files with ~1,886 lines of new code ensures reliability and correctness.

Test categories:
- **Dashboard API Tests**: Complete HTTP endpoint testing with mock data.
- **Conflict Detection Tests**: Unit tests for the 'bentrok' algorithm covering all edge cases.
- **Probation Logic Tests**: Verification of probation status advancement and handling.
- **Integration Tests**: Full-stack testing with Supabase JWT authentication.
- **Draft Interface Tests**: Testing of generate, publish, and assignment operations.

Key test scenarios:
- Kitchen leave conflicts between multiple employees.
- Bar shift capacity calculations on busy vs. regular days.
- Probation staff inclusion in coverage calculations.
- Access control enforcement for manager-only endpoints.
- Decision workflow persistence and audit trail.
- Draft generation from previous week data.
- Middle shift restriction validation.
- Server value synchronization in draft cells.

Test infrastructure:
- In-memory database mocks for fast execution.
- JWT token generation for authentication testing.
- Comprehensive seed data setup for realistic scenarios.
- Assertions covering both success and failure paths.

**Section sources**
- [dashboard.api-spec.ts:1-580](file://api/test/dashboard.api-spec.ts#L1-L580)
- [conflicts.spec.ts:1-98](file://api/src/request/conflicts.spec.ts#L1-L98)

## Performance Considerations
Target behaviors:
- Dashboard initial load under 2 seconds on typical mobile networks.
- Filter operations respond within 500 milliseconds.
- Real-time updates reflect new decisions within 3 seconds using efficient polling or server-sent events.
- Conflict computation runs on the backend to avoid heavy client-side processing.
- Draft generation completes within 5 seconds for typical staff sizes.

Optimization strategies:
- Paginate or virtualize large request lists.
- Cache summary metrics for short intervals.
- Use indexed queries for weekId, employeeId, and status fields.
- Avoid unnecessary re-renders by memoizing components and minimizing state changes.
- React Server Actions eliminate client-side state synchronization overhead.
- Efficient draft compilation with parallel data loading.
- Optimized database transactions for bulk operations.

## Troubleshooting Guide
Common issues and resolutions:
- Dashboard shows no requests: verify the upcoming week's request window is open and the manager has proper role permissions.
- Conflicts not appearing: confirm business rules for leave and shift limits are correctly applied; check that weekend coverage constraints are evaluated.
- Filters returning empty results: validate date range selection and employee filters; ensure timezone settings align with WITA.
- Slow loading: inspect network requests for large payloads; enable pagination and reduce returned fields.
- Decision actions failing: check React Server Action configuration and API connectivity.
- Draft generation fails: verify previous week exists and has sufficient data; check staff availability and permissions.
- Middle shift errors: ensure employee is kitchen staff and day is Monday-Thursday; verify business rules are properly enforced.
- Server value display issues: check useEffect synchronization and server state consistency.

Operational checks:
- Confirm database indexes exist for frequently queried columns.
- Validate that auth middleware enforces RBAC for dashboard endpoints.
- Ensure error responses include actionable messages for managers.
- Verify probation staff handling logic in production environments.
- Monitor draft generation performance and database transaction times.

**Section sources**
- [dashboard.controller.ts:1-59](file://api/src/request/dashboard.controller.ts#L1-L59)
- [schedule-controller.ts:1-100](file://api/src/schedule/schedule.controller.ts#L1-L100)
- [dashboard.service.ts:136-186](file://api/src/request/dashboard.service.ts#L136-L186)
- [schedule-service.ts:432-534](file://api/src/schedule/schedule.service.ts#L432-L534)

## Conclusion
The Manager Dashboard (F4) centralizes request review and conflict resolution for the upcoming week with a complete implementation featuring the 'bentrok' conflict detection engine, REST API endpoints, React Server Actions, and comprehensive test coverage. The addition of the Manager Draft Interface (F5) enhances the system with advanced scheduling capabilities including generate button functionality, per-day edit cards, source information display, middle shift restrictions, and critical server value display fixes.

Together, these interfaces provide a comprehensive solution for shift scheduling management, presenting pending approvals with clear priority indicators, highlighting scheduling conflicts, supporting robust filtering and bulk actions, and enabling detailed draft creation and editing. Acceptance criteria emphasize performance, real-time updates, accurate visualization, and seamless integration between request management and schedule drafting workflows.

The implementation demonstrates best practices in TypeScript, React Server Actions, NestJS architecture, and comprehensive testing, providing a solid foundation for future enhancements and maintenance while maintaining backward compatibility with existing dashboard functionality.