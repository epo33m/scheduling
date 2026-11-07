# Request Management Module (F3)

<cite>
**Referenced Files in This Document**
- [README.md](file://README.md)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document defines the functional specification for the Request Management module (F3) within the Kyne Shift Scheduling application. It covers leave request submission, shift preference requests, conflict detection, approval workflow, user stories, acceptance criteria, business logic, notifications, and audit trails. The specification is derived from the product requirements document and current repository state.

The project is currently a scaffold with no implementation code yet. Therefore, this document focuses on behavior, rules, data model alignment, and end-to-end flows that should be implemented when building F3.

**Section sources**
- [README.md:1-25](file://README.md#L1-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:1-267](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L1-L267)

## Project Structure
At this stage, the repository contains only documentation and a placeholder README. There is no backend or frontend code yet. The PRD describes the intended architecture using NestJS for the API, Next.js for the web/PWA, PostgreSQL via Prisma, and Supabase Auth.

```mermaid
graph TB
Repo["Repository"]
Docs["Product Requirements<br/>docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md"]
Readme["README.md"]
FutureAPI["Future Backend (NestJS)"]
FutureWeb["Future Frontend (Next.js PWA)"]
DB["PostgreSQL (Supabase)"]
Auth["Supabase Auth"]
Repo --> Docs
Repo --> Readme
Docs --> FutureAPI
Docs --> FutureWeb
FutureAPI --> DB
FutureWeb --> Auth
FutureWeb --> FutureAPI
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-249](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L249)

**Section sources**
- [README.md:1-25](file://README.md#L1-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-249](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L249)

## Core Components
F3 consists of two primary request types:
- Leave request: one day per week, Monday through Thursday only.
- Shift preference request: morning or evening preference per day, any day of the week.

Key capabilities include:
- Submission and editing during the open request window.
- Conflict detection for overlapping leave and over-subscription of preferred shifts.
- Approval workflow with status tracking.
- Manager dashboard visibility of conflicts and missing requests.
- Audit trail for request history.

Data model alignment:
- off_request: leave request entity.
- shift_request: shift preference entity.
- schedule_week: weekly context including deadline and status.
- employee: requester identity and role.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

## Architecture Overview
F3 integrates with authentication, scheduling, and publishing modules. The request lifecycle spans from staff submission to manager review and eventual scheduling application.

```mermaid
sequenceDiagram
participant Staff as "Staff User"
participant Web as "Next.js PWA"
participant API as "NestJS API"
participant DB as "PostgreSQL"
participant Scheduler as "Schedule Builder"
participant Notifier as "Notification Channel"
Staff->>Web : Submit leave or shift preference
Web->>API : Validate request window and constraints
API->>DB : Persist off_request or shift_request
API-->>Web : Return request status
Note over Web,API : During open window, edits allowed until Sunday 12 : 00 WITA
Staff->>Web : View own request status
Web->>API : Fetch request list
API-->>Web : Status pending/approved/rejected
API->>Scheduler : Apply approved requests during schedule build
Scheduler-->>API : Updated draft schedule
API->>Notifier : Notify staff of decision and schedule changes
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:73-90](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L73-L90)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-249](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L249)

## Detailed Component Analysis

### Leave Request Submission
Business rules:
- Only employees who are not probationary can submit leave requests.
- Leave days must be Monday through Thursday.
- Maximum one leave request per employee per week.
- Requests can be edited while the request window is open; after Sunday 12:00 WITA, they are locked.

Acceptance criteria:
- Form restricts selectable days to Monday–Thursday.
- System prevents more than one leave request per employee per week.
- UI shows “Leave: Tuesday” style status once submitted.
- After the deadline, submissions are rejected or locked depending on timing.

Validation flow:

```mermaid
flowchart TD
Start(["Submit Leave Request"]) --> CheckRole["Check Employee Role<br/>Probation?"]
CheckRole --> |Yes| Deny["Reject: Probation cannot request leave"]
CheckRole --> |No| CheckWindow["Check Request Window<br/>Before Sunday 12:00 WITA?"]
CheckWindow --> |No| Lock["Lock: Cannot edit after deadline"]
CheckWindow --> |Yes| CheckDay["Validate Day<br/>Monday–Thursday only"]
CheckDay --> |Invalid| ErrorDay["Error: Invalid day"]
CheckDay --> |Valid| CheckCount["Count existing leave requests<br/>for employee and week"]
CheckCount --> |>1| ErrorCount["Error: Max 1 leave per week"]
CheckCount --> |<=1| Persist["Persist off_request<br/>status = pending"]
Persist --> Success["Return success with status"]
Deny --> End(["End"])
Lock --> End
ErrorDay --> End
ErrorCount --> End
Success --> End
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)

### Shift Preference Request
Business rules:
- Employees may request morning or evening preferences per day.
- Any day of the week is eligible.
- Preferences are “best effort,” not guaranteed; managers decide final assignments.
- Multiple shift preference requests are allowed per employee per week, but at most one per day.

Acceptance criteria:
- UI allows selecting morning or evening per day.
- System enforces one preference per day.
- Submitted preferences appear in manager dashboard with status.
- Approved preferences are applied during schedule building; unapproved ones do not force assignment.

Submission flow:

```mermaid
flowchart TD
Start(["Submit Shift Preference"]) --> CheckWindow["Check Request Window"]
CheckWindow --> |Closed| Reject["Reject: Outside window"]
CheckWindow --> |Open| ValidateDay["Validate Day"]
ValidateDay --> Valid{"Valid day?"}
Valid --> |No| ErrorDay["Error: Invalid day"]
Valid --> |Yes| CheckExisting["Check existing preference for same day"]
CheckExisting --> |Exists| ErrorDup["Error: One preference per day"]
CheckExisting --> |None| Persist["Persist shift_request<br/>status = pending"]
Persist --> Success["Return success with status"]
Reject --> End(["End"])
ErrorDay --> End
ErrorDup --> End
Success --> End
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

### Conflict Detection Algorithms
Two categories of conflicts are defined:

- Leave conflicts: Two employees in the same position requesting leave on the same day.
- Shift preference conflicts: Too many employees requesting the same shift type on the same day, exceeding available slots.

Detection algorithm overview:

```mermaid
flowchart TD
Start(["Analyze Requests"]) --> LoadWeek["Load schedule_week and all requests"]
LoadWeek --> GroupByPosition["Group leave requests by position and date"]
GroupByPosition --> CountLeave["Count leave per position per date"]
CountLeave --> OverLimit{"Count > 1?"}
OverLimit --> |Yes| FlagLeave["Flag leave conflict"]
OverLimit --> |No| NextStep["Proceed to shift analysis"]
NextStep --> GroupByShift["Group shift preferences by position, date, shift_type"]
GroupByShift --> CountShift["Count preferences per group"]
CountShift --> SlotCheck{"Count exceeds slot limit?"}
SlotCheck --> |Yes| FlagShift["Flag shift conflict"]
SlotCheck --> |No| Done["No conflicts"]
FlagLeave --> Merge["Merge flags into manager dashboard"]
FlagShift --> Merge
Done --> End(["End"])
```

Manager resolution:
- For leave conflicts, the manager chooses which employee’s leave is approved.
- For shift preference conflicts, the manager decides who gets the preferred shift.
- Unapproved leave requests are treated like no request; the manager assigns the employee’s day off.

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:92-96](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L92-L96)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:132-138](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L132-L138)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:92-96](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L92-L96)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:132-138](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L132-L138)

### Approval Workflow and Status Tracking
Statuses:
- Pending: Initial state upon submission.
- Approved: Request accepted by the manager.
- Rejected: Request denied by the manager.

Workflow:
- Staff submits request; system records it as pending.
- Manager reviews requests on the dashboard, resolves conflicts, and sets decisions.
- Decisions update request status and record decision metadata (who decided and when).
- Approved leave requests are applied during schedule building; approved shift preferences are considered for assignment.

Sequence diagram:

```mermaid
sequenceDiagram
participant Staff as "Staff"
participant API as "Request Service"
participant Dashboard as "Manager Dashboard"
participant Schedule as "Schedule Builder"
Staff->>API : Submit leave/shift preference
API-->>Staff : Status = pending
Dashboard->>API : Review and resolve conflicts
API->>API : Update status to approved/rejected
API-->>Dashboard : Decision recorded
Schedule->>API : Fetch approved requests
API-->>Schedule : Apply to draft schedule
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

### Data Model Alignment
Entities relevant to F3:
- employee: requester identity, role, position, probation status.
- off_request: leave request with status and decision fields.
- shift_request: shift preference with status and decision fields.
- schedule_week: weekly context including deadlines and status.

Constraints enforced by the model:
- One leave request per employee per week.
- One shift preference per employee per day.
- Status fields track lifecycle and accountability.

Entity relationships:

```mermaid
erDiagram
EMPLOYEE {
uuid id PK
string name
string email
enum position
enum role
enum status
date probation_end_date
boolean is_active
}
SCHEDULE_WEEK {
uuid id PK
date start_date
enum status
datetime request_deadline
datetime published_at
uuid published_by
uuid copied_from_week_id
}
OFF_REQUEST {
uuid id PK
uuid week_id FK
uuid employee_id FK
date tanggal
enum status
uuid decided_by
datetime decided_at
}
SHIFT_REQUEST {
uuid id PK
uuid week_id FK
uuid employee_id FK
date tanggal
uuid shift_type_id
enum status
uuid decided_by
datetime decided_at
}
EMPLOYEE ||--o{ OFF_REQUEST : submits
EMPLOYEE ||--o{ SHIFT_REQUEST : prefers
SCHEDULE_WEEK ||--o{ OFF_REQUEST : contains
SCHEDULE_WEEK ||--o{ SHIFT_REQUEST : contains
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:197-209](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L197-L209)

### Notification Systems
MVP notification approach:
- No push notifications.
- Communication occurs via WhatsApp sharing of the published schedule link.
- In-app status indicates request outcomes and schedule availability.

Implications for F3:
- When a request is approved or rejected, the staff sees updated status in the app.
- Managers share the schedule link to notify staff about the published roster.
- Any post-publish changes are handled manually by the manager and communicated via WhatsApp.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:149-155](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L149-L155)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:218-228](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L218-L228)

### Audit Trails and Request History
Audit requirements:
- Every request should capture created_at, updated_at, and created_by.
- Decisions should capture decided_by and decided_at.
- Deletions should be soft deletes to preserve history.

Implementation guidance:
- Use UUIDs for IDs.
- Maintain created_by and updated_by where applicable.
- Preserve historical records even if employees are deactivated.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:210-217](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L210-L217)

## Dependency Analysis
F3 depends on:
- Authentication and authorization to ensure only eligible employees can submit requests and managers can review them.
- Weekly scheduling context to enforce deadlines and apply approved requests.
- Shift type definitions to validate morning/evening preferences.
- Coverage validation rules to inform manager decisions before publishing.

```mermaid
graph TB
F3["F3: Request Management"]
Auth["Auth Module"]
Week["Schedule Week Context"]
ShiftTypes["Shift Types"]
Coverage["Coverage Validation"]
Publish["Publish Module"]
F3 --> Auth
F3 --> Week
F3 --> ShiftTypes
F3 --> Coverage
F3 --> Publish
```

**Diagram sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-249](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L249)

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:230-249](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L230-L249)

## Performance Considerations
- Keep request validation lightweight and server-side to prevent client bypass.
- Cache weekly request counts and conflict flags to reduce repeated queries during peak submission times.
- Batch conflict detection runs during schedule building rather than on every request mutation.
- Ensure timezone handling is consistent (WITA) to avoid edge-case deadline errors.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Request submitted outside the window:
  - Verify request_deadline and current time in WITA.
  - Reject or lock based on policy.
- Duplicate leave request:
  - Enforce one leave per employee per week.
- Invalid leave day:
  - Restrict form to Monday–Thursday.
- Excessive shift preferences:
  - Enforce one preference per day and respect slot limits.
- Conflicts unresolved:
  - Prompt manager to choose approvers for leave and preferred shifts.
- Post-publish changes:
  - Manual process via manager; communicate via WhatsApp.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:73-90](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L73-L90)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)

## Conclusion
F3 defines clear boundaries for leave and shift preference requests, with strict constraints and robust conflict detection. The approval workflow ensures accountability and traceability, while the manager dashboard centralizes oversight. Notifications rely on in-app status and WhatsApp sharing in the MVP. The data model supports auditability and future ERP integration.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### User Stories
- As a staff member, I want to submit leave requests for Monday–Thursday, maximum one per week, so that my time off is recorded and considered during scheduling.
- As a staff member, I want to submit morning or evening shift preferences for any day, so that my preferred shifts are considered.
- As a manager, I want to see all requests, identify conflicts, and approve or reject them, so that the schedule reflects team needs and constraints.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-138](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L138)

### Acceptance Criteria Summary
- Leave requests restricted to Monday–Thursday and one per week.
- Shift preferences allowed per day, any day, with one per day.
- Request window opens when the previous week’s schedule is published and closes Sunday 12:00 WITA.
- Conflicts flagged for same-position leave overlaps and excessive shift preferences.
- Manager decides approvals; unapproved leave treated as no request.
- Audit fields capture creation, updates, and decisions.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:210-217](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L210-L217)