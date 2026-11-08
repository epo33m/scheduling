# Request Management Module (F3)

<cite>
**Referenced Files in This Document**
- [off_request.prisma](file://api/prisma/schema/off_request.prisma)
- [shift_request.prisma](file://api/prisma/schema/shift_request.prisma)
- [schedule_week.prisma](file://api/prisma/schema/schedule_week.prisma)
- [request.controller.ts](file://api/src/request/request.controller.ts)
- [request.service.ts](file://api/src/request/request.service.ts)
- [off-day.ts](file://api/src/request/off-day.ts)
- [request-window.ts](file://api/src/request/request-window.ts)
- [page.tsx](file://web/app/staff/request/page.tsx)
- [request-controls.tsx](file://web/app/staff/request/request-controls.tsx)
- [request-labels.ts](file://web/lib/request-labels.ts)
- [request.api-spec.ts](file://api/test/request.api-spec.ts)
- [0002-jendela-request-dikunci-tanpa-cron.md](file://docs/adr/0002-jendela-request-dikunci-tanpa-cron.md)
</cite>

## Update Summary
**Changes Made**
- Updated Project Structure section to reflect complete implementation with NestJS backend and Next.js frontend
- Added detailed Database Schema Analysis section covering off_request, shift_request, and schedule_week models
- Enhanced REST API Endpoints section with staff role protection and comprehensive endpoint documentation
- Updated Server-Side Interface section with Indonesian localization and server-rendered components
- Added Probation Gate Enforcement details and Window-Lock Validation mechanisms
- Expanded Testing Coverage section with comprehensive test scenarios
- Updated all diagrams to reflect actual implementation architecture

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Database Schema Analysis](#database-schema-analysis)
4. [REST API Endpoints](#rest-api-endpoints)
5. [Server-Side Interface](#server-side-interface)
6. [Core Business Logic](#core-business-logic)
7. [Probation Gate Enforcement](#probation-gate-enforcement)
8. [Window-Lock Validation](#window-lock-validation)
9. [Testing Coverage](#testing-coverage)
10. [Architecture Overview](#architecture-overview)
11. [Detailed Component Analysis](#detailed-component-analysis)
12. [Dependency Analysis](#dependency-analysis)
13. [Performance Considerations](#performance-considerations)
14. [Troubleshooting Guide](#troubleshooting-guide)
15. [Conclusion](#conclusion)
16. [Appendices](#appendices)

## Introduction
This document defines the functional specification for the Request Management module (F3) within the Kyne Shift Scheduling application. The module is fully implemented with a NestJS backend providing REST API endpoints under `/requests`, a server-rendered Next.js frontend with Indonesian localization, and comprehensive database schemas supporting leave requests and shift preferences.

The implementation includes strict business rules: Monday-Thursday only for leave requests, maximum one request per week per employee, probation gate enforcement, window-lock validation, and complete audit trails. The system supports both leave requests (libur) and shift preference requests (Pagi/Sore shifts) with proper conflict detection and approval workflow integration.

**Section sources**
- [README.md:1-25](file://README.md#L1-L25)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:1-267](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L1-L267)

## Project Structure
The F3 module is fully implemented with a clear separation between backend and frontend:

```mermaid
graph TB
Repo["Repository"]
API["NestJS Backend<br/>api/src/request/"]
Web["Next.js Frontend<br/>web/app/staff/request/"]
DB["PostgreSQL via Prisma<br/>api/prisma/schema/"]
Auth["Supabase Auth Integration"]
Repo --> API
Repo --> Web
API --> DB
Web --> API
API --> Auth
Web --> Auth
subgraph "Backend Components"
Controller["RequestController"]
Service["RequestService"]
Validators["Business Rules"]
end
subgraph "Frontend Components"
Page["Server-Rendered Page"]
Controls["Request Controls"]
Labels["Indonesian Localization"]
end
subgraph "Database Models"
OffRequest["OffRequest Model"]
ShiftRequest["ShiftRequest Model"]
ScheduleWeek["ScheduleWeek Model"]
end
API --> Controller
Controller --> Service
Service --> Validators
Web --> Page
Page --> Controls
Controls --> Labels
DB --> OffRequest
DB --> ShiftRequest
DB --> ScheduleWeek
```

**Diagram sources**
- [request.controller.ts:27-78](file://api/src/request/request.controller.ts#L27-L78)
- [request.service.ts:44-257](file://api/src/request/request.service.ts#L44-L257)
- [page.tsx:48-124](file://web/app/staff/request/page.tsx#L48-L124)
- [off_request.prisma:16-34](file://api/prisma/schema/off_request.prisma#L16-L34)

**Section sources**
- [request.controller.ts:27-78](file://api/src/request/request.controller.ts#L27-L78)
- [page.tsx:48-124](file://web/app/staff/request/page.tsx#L48-L124)

## Database Schema Analysis
The F3 module uses three core database models with comprehensive constraints and relationships:

### OffRequest Model
The `off_request` table stores leave requests with strict business rule enforcement:

```mermaid
erDiagram
OFF_REQUEST {
uuid id PK
uuid week_id FK
uuid employee_id FK
date tanggal
enum status
uuid decided_by
datetime decided_at
datetime created_at
datetime updated_at
uuid created_by
}
SCHEDULE_WEEK ||--o{ OFF_REQUEST : contains
EMPLOYEE ||--o{ OFF_REQUEST : submits
%% Constraints
@@unique([weekId, employeeId]) // One leave per employee per week
@@index([employeeId]) // Query optimization
```

Key features:
- **Unique constraint**: Prevents multiple leave requests per employee per week
- **Date validation**: Enforces Monday-Thursday restriction at database level
- **Audit fields**: Tracks creation, updates, and decisions
- **Cascade deletion**: Automatically removes requests when weeks or employees are deleted

### ShiftRequest Model
The `shift_request` table manages shift preferences with per-day granularity:

```mermaid
erDiagram
SHIFT_REQUEST {
uuid id PK
uuid week_id FK
uuid employee_id FK
date tanggal
enum shift_code
enum status
uuid decided_by
datetime decided_at
datetime created_at
datetime updated_at
uuid created_by
}
SCHEDULE_WEEK ||--o{ SHIFT_REQUEST : contains
EMPLOYEE ||--o{ SHIFT_REQUEST : prefers
%% Constraints
@@unique([weekId, employeeId, tanggal]) // One preference per day
@@index([employeeId]) // Query optimization
```

Key features:
- **Per-day uniqueness**: Allows multiple shift preferences across different days
- **Shift type validation**: Only PAGI and SORE are requestable (MIDDLE is manager-assigned)
- **Best-effort processing**: Status indicates pending/approved/rejected decisions

### ScheduleWeek Model
The `schedule_week` table provides weekly context and deadline management:

```mermaid
erDiagram
SCHEDULE_WEEK {
uuid id PK
date start_date
enum status
datetime request_deadline
datetime published_at
uuid published_by
uuid copied_from_week_id
datetime created_at
datetime updated_at
uuid created_by
}
%% Key Relationships
SCHEDULE_WEEK ||--o{ OFF_REQUEST : contains
SCHEDULE_WEEK ||--o{ SHIFT_REQUEST : contains
```

Key features:
- **Deadline-driven windows**: Request window opens/closes based on `request_deadline`
- **Status tracking**: Draft/published states for scheduling lifecycle
- **Reference integrity**: Links to previous weeks for copying functionality

**Section sources**
- [off_request.prisma:16-34](file://api/prisma/schema/off_request.prisma#L16-L34)
- [shift_request.prisma:7-26](file://api/prisma/schema/shift_request.prisma#L7-L26)
- [schedule_week.prisma:13-32](file://api/prisma/schema/schedule_week.prisma#L13-L32)

## REST API Endpoints
The F3 module exposes a comprehensive REST API under `/requests` with staff role protection:

### Authentication & Authorization
All endpoints require authentication and staff role:
- **Authentication**: Supabase JWT tokens via AuthGuard
- **Authorization**: Staff role required (managers get 403 Forbidden)
- **Probation gate**: Probationary staff blocked even with staff role

### Core Endpoints

#### GET /requests
Retrieves current request state for authenticated staff member.

**Response**: `StaffRequests` object containing:
- `weekStartDate`: Target week's Monday date
- `requestDeadline`: Window closing deadline (ISO string)
- `windowOpen`: Boolean indicating if submissions are allowed
- `offRequest`: Current leave request (null if none)
- `shiftRequests`: Array of shift preferences

**Access Control**: 
- ✅ Staff members (non-probation)
- ❌ Managers (403 Forbidden)
- ❌ Probationary staff (403 Forbidden)
- ❌ Unauthenticated users (401 Unauthorized)

#### PUT /requests/off
Submits or updates a leave request.

**Request Body**: `{ tanggal: "YYYY-MM-DD" }`
**Validation**:
- Date must be Monday-Thursday
- Must be within target week
- Maximum one leave request per week (enforced by unique constraint)

**Response**: `OffRequestView` with updated status

#### DELETE /requests/off
Cancels existing leave request.

**Access**: Requires open request window

#### PUT /requests/shift
Submits or updates shift preference for a specific day.

**Request Body**: `{ tanggal: "YYYY-MM-DD", shiftCode: "PAGI" | "SORE" }`
**Validation**:
- Date must be within target week
- Only PAGI and SORE shifts are requestable
- One preference per day enforced by unique constraint

**Response**: `ShiftRequestView` with updated status

#### DELETE /requests/shift?tanggal=YYYY-MM-DD
Removes shift preference for specified day.

**Query Parameters**: `tanggal` - ISO date string

### Error Handling
- **400 Bad Request**: Invalid input data or business rule violations
- **401 Unauthorized**: Missing or invalid authentication token
- **403 Forbidden**: Insufficient permissions (manager/probation access)
- **409 Conflict**: Request window closed or duplicate requests

**Section sources**
- [request.controller.ts:27-78](file://api/src/request/request.controller.ts#L27-L78)
- [request.api-spec.ts:325-351](file://api/test/request.api-spec.ts#L325-L351)

## Server-Side Interface
The F3 module provides a server-rendered Next.js interface with full Indonesian localization:

### Main Request Page
The page component (`page.tsx`) implements server-side rendering with dynamic content:

```mermaid
flowchart TD
LoadPage["Load Request Page"] --> CheckAuth["Check Authentication"]
CheckAuth --> GetRequests["Fetch Staff Requests"]
GetRequests --> HandleError{"Error?"}
HandleError --> |Yes| ShowError["Show Error Message"]
HandleError --> |No| CheckGated{"Probation/Manager?"}
CheckGated --> |Yes| ShowGate["Show Access Denied"]
CheckGated --> |No| RenderControls["Render Request Controls"]
RenderControls --> DisplayWeek["Display Target Week Info"]
DisplayWeek --> CheckWindow["Check Request Window"]
CheckWindow --> EnableControls["Enable/Disable Controls"]
```

**Key Features**:
- **Server-side rendering**: Fresh data on every visit, no stale state
- **Indonesian localization**: All UI text in Bahasa Indonesia
- **Timezone handling**: WITA (Asia/Makassar) timezone support
- **Dynamic content**: Real-time window status checking

### Request Controls Component
The interactive controls provide two main sections:

#### Leave Request Section
- Displays current leave request status
- Shows "Libur: Tuesday" format for selected days
- Provides cancellation option for existing requests
- Restricts selection to Monday-Thursday only

#### Shift Preference Section
- Per-day shift preference controls
- Supports PAGI (morning) and SORE (evening) preferences
- Shows current preference status and manager decision
- Best-effort messaging: "Manager will try, not guarantee"

### Indonesian Localization System
Comprehensive localization through dedicated label files:

```typescript
// Day names in Indonesian
const DAY_NAMES = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

// Shift labels
const SHIFT_LABEL = {
  PAGI: 'Pagi',
  SORE: 'Sore', 
  MIDDLE: 'Middle'
};

// Request status labels
const REQUEST_STATUS_LABEL = {
  pending: 'Menunggu keputusan manager',
  approved: 'Disetujui',
  rejected: 'Belum dikabulkan'
};
```

**Section sources**
- [page.tsx:48-124](file://web/app/staff/request/page.tsx#L48-L124)
- [request-controls.tsx:38-189](file://web/app/staff/request/request-controls.tsx#L38-L189)
- [request-labels.ts:1-66](file://web/lib/request-labels.ts#L1-L66)

## Core Business Logic
The F3 module implements comprehensive business rules through dedicated service logic:

### Leave Request Rules
- **Day restriction**: Only Monday-Thursday (Senin-Kamis)
- **Weekly limit**: Maximum one leave request per employee per week
- **Window enforcement**: Submissions only during open request window
- **Probation gate**: Probationary staff cannot submit requests

### Shift Preference Rules  
- **Daily granularity**: One preference per day, any day of week
- **Shift types**: Only PAGI and SORE are requestable (MIDDLE is manager-assigned)
- **Best-effort processing**: Preferences are considered but not guaranteed
- **Window enforcement**: Same request window as leave requests

### Request Window Management
The system uses deadline-based window control without cron jobs:

```mermaid
stateDiagram-v2
[*] --> Open : Week Published
Open --> Closed : Sunday 12 : 00 WITA
Closed --> Open : Next Week Published
note right of Open
Request window open
Submissions allowed
Deadline approaching
end note
note right of Closed
Request window closed
No new submissions
Existing requests visible
end note
```

**Implementation**: Window state derived from `request_deadline` field comparison with current time.

**Section sources**
- [request.service.ts:104-197](file://api/src/request/request.service.ts#L104-L197)
- [off-day.ts:8-11](file://api/src/request/off-day.ts#L8-L11)
- [request-window.ts:10-36](file://api/src/request/request-window.ts#L10-L36)

## Probation Gate Enforcement
The F3 module implements strict probation gate enforcement through multiple layers:

### Multi-Layer Protection
1. **API Level**: Controller decorated with `@Roles('staff')`
2. **Service Level**: Probation status check in `assertCanRequest()`
3. **Frontend Level**: Page handles 403 responses gracefully

### Probation Status Resolution
The system dynamically calculates probation status using lazy advancement:

```mermaid
flowchart TD
CheckEmployee["Check Employee Record"] --> HasRecord{"Has record?"}
HasRecord --> |Yes| CalculateProbation["Calculate advanced probation status"]
HasRecord --> |No| UseActorStatus["Use actor status from token"]
CalculateProbation --> IsProbation{"Is probation?"}
UseActorStatus --> IsProbation
IsProbation --> |Yes| BlockAccess["Block access - 403 Forbidden"]
IsProbation --> |No| AllowAccess["Allow access"]
```

### User Experience
- **Probationary staff**: See error message "Menu request terbuka setelah masa probation selesai"
- **Manager access**: Also blocked with same 403 response
- **Graceful degradation**: Frontend shows appropriate error messages

**Section sources**
- [request.service.ts:226-245](file://api/src/request/request.service.ts#L226-L245)
- [request.controller.ts:21-29](file://api/src/request/request.controller.ts#L21-L29)
- [page.tsx:56-65](file://web/app/staff/request/page.tsx#L56-L65)

## Window-Lock Validation
The F3 module implements robust window-lock validation following ADR 0002 principles:

### Deadline-Based Locking
Unlike traditional approaches using cron jobs, this implementation derives window state from stored deadlines:

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "API Service"
participant DB as "Database"
Client->>API : Submit Request
API->>DB : Find Open Window
DB-->>API : Return Week with Deadline
API->>API : Compare now vs deadline
alt Window Open
API->>DB : Save Request
API-->>Client : Success
else Window Closed
API-->>Client : 409 Conflict
end
```

### Timezone Handling
- **Storage**: Deadlines stored as UTC instants
- **Calculation**: WITA wall clock (Sunday 12:00) baked into stored deadlines
- **Comparison**: Plain instant comparison avoids timezone complexity

### Read vs Write Behavior
- **Read operations**: Report locked window but don't block (UI disables controls)
- **Write operations**: Hard rejection with 409 Conflict when window closed

**Section sources**
- [request-window.ts:10-36](file://api/src/request/request-window.ts#L10-L36)
- [request.service.ts:204-218](file://api/src/request/request.service.ts#L204-L218)
- [0002-jendela-request-dikunci-tanpa-cron.md:1-4](file://docs/adr/0002-jendela-request-dikunci-tanpa-cron.md#L1-L4)

## Testing Coverage
The F3 module includes comprehensive test coverage validating all business rules and edge cases:

### Test Categories
1. **Access Control Tests**: Verify staff-only access and probation blocking
2. **Business Rule Tests**: Validate day restrictions, weekly limits, and window enforcement
3. **Integration Tests**: Full HTTP flow testing with mocked database layer
4. **Edge Case Tests**: Boundary conditions and error scenarios

### Key Test Scenarios

#### Access Control Validation
```typescript
it('refuses an unauthenticated caller', async () => {
  await request(app.getHttpServer()).get('/requests').expect(401);
});

it('refuses a manager the staff request surface', async () => {
  await request(app.getHttpServer())
    .get('/requests')
    .set('Authorization', `Bearer ${await accessToken('maya@kyne.test')}`)
    .expect(403);
});

it('refuses a probation staff the menu (ADR 0003)', async () => {
  const probo = `Bearer ${await accessToken('probo@kyne.test')}`;
  await request(app.getHttpServer())
    .get('/requests')
    .set('Authorization', probo)
    .expect(403);
});
```

#### Business Rule Validation
- **Monday-Thursday restriction**: Tests verify weekend dates are rejected
- **One leave per week**: Tests ensure unique constraint prevents duplicates
- **Window enforcement**: Tests validate open/closed window behavior
- **Probation gate**: Tests confirm probationary staff access denial

### Test Architecture
Tests use in-memory fakes for database operations, allowing comprehensive validation without live database dependencies:

```mermaid
flowchart TD
TestSuite["Test Suite"] --> MockDB["Mocked Database Layer"]
MockDB --> InMemoryStore["In-Memory Data Store"]
TestSuite --> HTTPClient["HTTP Client"]
HTTPClient --> API["API Endpoints"]
API --> MockDB
subgraph "Test Data"
Employees["Employee Records"]
Weeks["Week Records"]
Requests["Request Records"]
end
InMemoryStore --> Employees
InMemoryStore --> Weeks
InMemoryStore --> Requests
```

**Section sources**
- [request.api-spec.ts:79-200](file://api/test/request.api-spec.ts#L79-L200)
- [request.api-spec.ts:325-351](file://api/test/request.api-spec.ts#L325-L351)

## Architecture Overview
The F3 module follows a clean layered architecture with clear separation of concerns:

```mermaid
graph TB
Client["Next.js Client"]
API["NestJS API"]
Service["Request Service"]
Validator["Business Rules"]
DB["Prisma Database"]
Client --> API
API --> Service
Service --> Validator
Validator --> DB
subgraph "Request Flow"
Auth["Authentication"]
RBAC["Role-Based Access"]
Probation["Probation Gate"]
Window["Window Validation"]
end
API --> Auth
Auth --> RBAC
RBAC --> Probation
Probation --> Window
Window --> Service
```

### Component Responsibilities
- **Controller Layer**: HTTP request/response handling, parameter validation
- **Service Layer**: Business logic orchestration, data manipulation
- **Validator Layer**: Business rule enforcement, data validation
- **Data Layer**: Database operations, entity persistence

**Diagram sources**
- [request.controller.ts:27-78](file://api/src/request/request.controller.ts#L27-L78)
- [request.service.ts:44-257](file://api/src/request/request.service.ts#L44-L257)

## Detailed Component Analysis

### Request Service Implementation
The `RequestService` encapsulates all business logic for request management:

#### Core Methods
- **`view()`**: Retrieves complete request state for display
- **`setOff()`**: Creates/updates leave requests with validation
- **`cancelOff()`**: Removes existing leave requests
- **`setShift()`**: Manages shift preferences per day
- **`cancelShift()`**: Removes shift preferences

#### Validation Pipeline
```mermaid
flowchart TD
Input["Request Input"] --> Parse["Parse & Validate"]
Parse --> CheckWindow["Check Request Window"]
CheckWindow --> CheckProbation["Check Probation Status"]
CheckProbation --> CheckDate["Validate Date Range"]
CheckDate --> CheckRules["Apply Business Rules"]
CheckRules --> Persist["Persist to Database"]
Persist --> Response["Return Response"]
CheckRules --> |Violation| Error["Throw Exception"]
CheckWindow --> |Closed| Error
CheckProbation --> |Probation| Error
CheckDate --> |Invalid| Error
```

**Section sources**
- [request.service.ts:54-102](file://api/src/request/request.service.ts#L54-L102)
- [request.service.ts:104-197](file://api/src/request/request.service.ts#L104-L197)

### Frontend Component Architecture
The frontend uses React Server Components with client-side interactivity:

#### Page Component Strategy
- **Server-side rendering**: Initial page load with fresh data
- **Client-side hydration**: Interactive controls after hydration
- **Error handling**: Graceful fallbacks for network/auth failures
- **State management**: Form state via React hooks

#### Interactive Controls Design
- **Form-first approach**: HTML forms work before JavaScript loads
- **Progressive enhancement**: Enhanced UX with JavaScript enabled
- **Accessibility**: Proper ARIA labels and semantic markup
- **Responsive design**: Mobile-friendly layout

**Section sources**
- [page.tsx:48-124](file://web/app/staff/request/page.tsx#L48-L124)
- [request-controls.tsx:38-189](file://web/app/staff/request/request-controls.tsx#L38-L189)

## Dependency Analysis
The F3 module has well-defined dependencies on other system components:

```mermaid
graph TB
F3["F3: Request Management"]
Auth["Authentication Module"]
Employee["Employee Module"]
Scheduler["Schedule Builder"]
Types["@repo/types"]
Validators["@repo/validators"]
F3 --> Auth
F3 --> Employee
F3 --> Scheduler
F3 --> Types
F3 --> Validators
subgraph "External Dependencies"
Prisma["Prisma ORM"]
Supabase["Supabase Auth"]
Zod["Zod Validation"]
end
F3 --> Prisma
F3 --> Supabase
F3 --> Zod
```

### Internal Dependencies
- **Employee Module**: Probation status calculation and employee data
- **Types Package**: Shared TypeScript interfaces and enums
- **Validators Package**: Input validation schemas and utilities

### External Dependencies
- **Prisma**: Database ORM and schema management
- **Supabase**: Authentication and user management
- **Zod**: Runtime type validation

**Diagram sources**
- [request.service.ts:1-19](file://api/src/request/request.service.ts#L1-L19)
- [request.controller.ts:1-19](file://api/src/request/request.controller.ts#L1-L19)

**Section sources**
- [request.service.ts:1-19](file://api/src/request/request.service.ts#L1-L19)
- [request.controller.ts:1-19](file://api/src/request/request.controller.ts#L1-L19)

## Performance Considerations
The F3 module is designed for optimal performance:

### Database Optimization
- **Index usage**: Strategic indexes on frequently queried columns
- **Query optimization**: Efficient joins and selective data retrieval
- **Connection pooling**: Prisma connection management

### Caching Strategy
- **Request window caching**: Minimize repeated window calculations
- **Session data**: Leverage browser caching for static content
- **API response caching**: Appropriate cache headers for public data

### Timezone Efficiency
- **UTC storage**: Consistent timezone handling reduces conversion overhead
- **Lazy evaluation**: Probation status calculated only when needed
- **Batch operations**: Group related database operations where possible

## Troubleshooting Guide
Common issues and their resolutions:

### Authentication Issues
- **401 Unauthorized**: Verify Supabase JWT configuration and token validity
- **403 Forbidden**: Check user role assignment and probation status
- **Probation blocking**: Verify probation end date and status calculation

### Request Submission Problems
- **Window closed errors**: Check `request_deadline` values and timezone settings
- **Invalid day errors**: Ensure dates fall within Monday-Thursday range
- **Duplicate requests**: Verify unique constraint violations and cleanup strategies

### Database Connection Issues
- **Prisma connection errors**: Verify database credentials and connection strings
- **Migration problems**: Check migration status and schema consistency
- **Constraint violations**: Review foreign key relationships and referential integrity

### Frontend Rendering Issues
- **Hydration mismatches**: Ensure server/client data consistency
- **Localization problems**: Verify Indonesian locale configuration
- **Timezone display**: Check WITA timezone settings in client code

**Section sources**
- [request.api-spec.ts:325-351](file://api/test/request.api-spec.ts#L325-L351)
- [page.tsx:56-65](file://web/app/staff/request/page.tsx#L56-L65)

## Conclusion
The F3 Request Management module is a fully implemented, production-ready system that successfully addresses all requirements from the product specification. It provides robust leave request and shift preference management with comprehensive business rule enforcement, secure authentication, and excellent user experience.

Key achievements include:
- Complete database schema with proper constraints and relationships
- Secure REST API with multi-layer authorization
- Server-rendered Next.js interface with full Indonesian localization
- Comprehensive testing coverage ensuring reliability
- Clean architecture with clear separation of concerns
- Robust error handling and user feedback

The system successfully enforces all business rules including Monday-Thursday restrictions, weekly limits, probation gates, and window locking, while providing an intuitive user interface for staff members to manage their scheduling preferences.

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
- Request window opens when the previous week's schedule is published and closes Sunday 12:00 WITA.
- Conflicts flagged for same-position leave overlaps and excessive shift preferences.
- Manager decides approvals; unapproved leave treated as no request.
- Audit fields capture creation, updates, and decisions.

**Section sources**
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:122-130](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L122-L130)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:165-195](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L165-L195)
- [PRD-Aplikasi-Penjadwalan-Shift-Kyne.md:210-217](file://docs/PRD-Aplikasi-Penjadwalan-Shift-Kyne.md#L210-L217)

### Technical Specifications
- **Backend Framework**: NestJS with TypeScript
- **Frontend Framework**: Next.js with React Server Components
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Supabase Auth with JWT tokens
- **Validation**: Zod for runtime type checking
- **Testing**: Jest for unit tests, Supertest for API tests
- **Deployment**: Containerized with Docker support

**Section sources**
- [package.json](file://api/package.json)
- [tsconfig.json](file://api/tsconfig.json)
- [vitest.config.ts](file://api/vitest.config.ts)