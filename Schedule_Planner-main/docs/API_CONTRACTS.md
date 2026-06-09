# API_CONTRACTS.md

Base URL:

```text
/api/v1
```

All request and response bodies must use DTOs. JPA entities must never be exposed directly.

This application does not support public self-registration.

Employees cannot create their own accounts.

Only `ADMIN` can create `MANAGER` accounts.

Only `ADMIN` and `MANAGER` can create `EMPLOYEE` accounts.

Supported scheduling employee roles:

```text
WAITER
RUNNER
BARTENDER
```

## Common Error Response

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Email is required"
    }
  ]
}
```

# 1. Authentication API

## Login

```http
POST /api/v1/auth/login
```

Request:

```json
{
  "email": "manager@restaurant.com",
  "password": "password123"
}
```

Response:

```json
{
  "accessToken": "jwt-token",
  "tokenType": "Bearer",
  "user": {
    "id": "uuid",
    "email": "manager@restaurant.com",
    "systemRole": "MANAGER"
  }
}
```

Errors:

* `401 INVALID_CREDENTIALS`
* `400 VALIDATION_ERROR`

## Get Current User

```http
GET /api/v1/auth/me
```

Access:

* Authenticated user with `Bearer` token

Response:

```json
{
  "id": "uuid",
  "email": "manager@restaurant.com",
  "systemRole": "MANAGER",
  "employeeId": "uuid"
}
```

# 2. User Account API

## Create Manager Account

Only `ADMIN` can create manager accounts.

```http
POST /api/v1/users/managers
```

Request:

```json
{
  "email": "manager@restaurant.com",
  "password": "temporaryPassword123",
  "firstName": "Maria",
  "lastName": "Meyer"
}
```

Response:

```json
{
  "id": "uuid",
  "email": "manager@restaurant.com",
  "systemRole": "MANAGER",
  "active": true
}
```

Errors:

* `403 ACCESS_DENIED`
* `409 USER_EMAIL_ALREADY_EXISTS`

## Create Employee Account

Only `ADMIN` and `MANAGER` can create employee accounts.

```http
POST /api/v1/users/employees
```

Request:

```json
{
  "email": "john.doe@restaurant.com",
  "password": "temporaryPassword123",
  "employeeId": "uuid"
}
```

Response:

```json
{
  "id": "uuid",
  "email": "john.doe@restaurant.com",
  "systemRole": "EMPLOYEE",
  "employeeId": "uuid",
  "active": true
}
```

Errors:

* `403 ACCESS_DENIED`
* `409 USER_EMAIL_ALREADY_EXISTS`
* `404 EMPLOYEE_NOT_FOUND`

# 3. Employee API

## Create Employee Profile

Only `ADMIN` and `MANAGER` can create employee profiles.

```http
POST /api/v1/employees
```

Request:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@restaurant.com",
  "phone": "+49123456789",
  "employmentType": "PART_TIME",
  "employeeRole": "WAITER",
  "hourlyRate": 14.5,
  "weeklyHourLimit": 25
}
```

Response:

```json
{
  "id": "uuid",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@restaurant.com",
  "phone": "+49123456789",
  "employmentType": "PART_TIME",
  "employeeRole": "WAITER",
  "hourlyRate": 14.5,
  "weeklyHourLimit": 25,
  "active": true
}
```

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`
* `409 EMPLOYEE_EMAIL_ALREADY_EXISTS`

## Get Employee By ID

```http
GET /api/v1/employees/{employeeId}
```

Access:

* `ADMIN` and `MANAGER` can view any employee.
* `EMPLOYEE` can view only their own employee profile.

## List Employees

```http
GET /api/v1/employees
```

Access:

* `ADMIN`
* `MANAGER`

Optional query params:

```text
active=true
employmentType=PART_TIME
employeeRole=WAITER
```

## Update Employee

```http
PUT /api/v1/employees/{employeeId}
```

Access:

* `ADMIN`
* `MANAGER`

## Deactivate Employee

```http
PATCH /api/v1/employees/{employeeId}/deactivate
```

Access:

* `ADMIN`
* `MANAGER`

# 4. Availability API

## Submit Weekly Availability

```http
POST /api/v1/availability
```

Access:

* `EMPLOYEE` can submit their own availability.
* `MANAGER` and `ADMIN` can submit availability on behalf of employees.

Request:

```json
{
  "employeeId": "uuid",
  "weekStartDate": "2026-04-06",
  "entries": [
    {
      "date": "2026-04-06",
      "startTime": "09:00",
      "endTime": "17:00",
      "available": true,
      "preferred": true
    }
  ]
}
```

Response:

```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "weekStartDate": "2026-04-06",
  "status": "SUBMITTED",
  "entries": [
    {
      "date": "2026-04-06",
      "startTime": "09:00",
      "endTime": "17:00",
      "available": true,
      "preferred": true
    }
  ]
}
```

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`
* `409 AVAILABILITY_ALREADY_SUBMITTED`
* `409 AVAILABILITY_DEADLINE_PASSED`

## Update Availability

```http
PUT /api/v1/availability/{availabilityId}
```

Access:

* `EMPLOYEE` can update their own availability before the deadline.
* `MANAGER` and `ADMIN` can update availability on behalf of employees.

## Get Employee Availability

```http
GET /api/v1/employees/{employeeId}/availability?weekStartDate=2026-04-06
```

Access:

* `ADMIN` and `MANAGER` can view any employee availability.
* `EMPLOYEE` can view only their own availability.

## Manager View Weekly Availability

```http
GET /api/v1/availability?weekStartDate=2026-04-06
```

Access:

* `ADMIN`
* `MANAGER`

# 5. Shift API

## Create Shift

```http
POST /api/v1/shifts
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "date": "2026-04-06",
  "startTime": "17:00",
  "endTime": "23:00",
  "employeeRole": "WAITER",
  "requiredCount": 4
}
```

Response:

```json
{
  "id": "uuid",
  "date": "2026-04-06",
  "startTime": "17:00",
  "endTime": "23:00",
  "employeeRole": "WAITER",
  "requiredCount": 4
}
```

Allowed values for `employeeRole`:

```text
WAITER
RUNNER
BARTENDER
```

## List Shifts

```http
GET /api/v1/shifts?from=2026-04-06&to=2026-04-12
```

Access:

* `ADMIN`
* `MANAGER`

## Update Shift

```http
PUT /api/v1/shifts/{shiftId}
```

Access:

* `ADMIN`
* `MANAGER`

## Delete Shift

```http
DELETE /api/v1/shifts/{shiftId}
```

Access:

* `ADMIN`
* `MANAGER`

# 6. Schedule API

## Generate Draft Schedule

Only `ADMIN` and `MANAGER` can generate draft schedules.

```http
POST /api/v1/schedules/generate
```

Request:

```json
{
  "weekStartDate": "2026-04-06"
}
```

Response:

```json
{
  "id": "uuid",
  "weekStartDate": "2026-04-06",
  "status": "DRAFT",
  "assignments": [
    {
      "assignmentId": "uuid",
      "shiftId": "uuid",
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "date": "2026-04-06",
      "startTime": "17:00",
      "endTime": "23:00",
      "employeeRole": "WAITER"
    }
  ],
  "warnings": [
    {
      "code": "STAFFING_SHORTAGE",
      "message": "Not enough available employees for Monday dinner shift."
    }
  ]
}
```

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`
* `409 MISSING_AVAILABILITY`
* `409 STAFFING_REQUIREMENT_NOT_MET`

## Get Schedule

```http
GET /api/v1/schedules/{scheduleId}
```

Access:

* `ADMIN` and `MANAGER` can view `DRAFT`, `APPROVED`, and `PUBLISHED` schedules.
* `EMPLOYEE` can only view `PUBLISHED` schedules for their own employee role.

## Get Weekly Schedule

```http
GET /api/v1/schedules?weekStartDate=2026-04-06
```

Access:

* `ADMIN` and `MANAGER` can view `DRAFT`, `APPROVED`, and `PUBLISHED` schedules.
* `EMPLOYEE` can only view `PUBLISHED` schedules for their own employee role.

## Manually Add Assignment To Draft Schedule

```http
POST /api/v1/schedules/{scheduleId}/assignments
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "shiftId": "uuid",
  "employeeId": "uuid"
}
```

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_EDITABLE`
* `409 EMPLOYEE_ROLE_MISMATCH`
* `409 EMPLOYEE_UNAVAILABLE`
* `409 SHIFT_OVERLAP`
* `409 WEEKLY_HOUR_LIMIT_EXCEEDED`
* `409 EMPLOYEE_ON_LEAVE`

## Manually Remove Assignment From Draft Schedule

```http
DELETE /api/v1/schedules/{scheduleId}/assignments/{assignmentId}
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_EDITABLE`

## Replace Assignment In Draft Schedule

```http
PUT /api/v1/schedules/{scheduleId}/assignments/{assignmentId}
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "employeeId": "uuid"
}
```

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_EDITABLE`
* `409 EMPLOYEE_ROLE_MISMATCH`
* `409 EMPLOYEE_UNAVAILABLE`
* `409 SHIFT_OVERLAP`
* `409 WEEKLY_HOUR_LIMIT_EXCEEDED`
* `409 EMPLOYEE_ON_LEAVE`

## Approve Schedule

Only `ADMIN` and `MANAGER` can approve schedules.

```http
PATCH /api/v1/schedules/{scheduleId}/approve
```

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_IN_DRAFT_STATUS`

## Reject Schedule

Only `ADMIN` and `MANAGER` can reject draft schedules.

```http
PATCH /api/v1/schedules/{scheduleId}/reject
```

Request:

```json
{
  "reason": "Too many uncovered shifts."
}
```

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_IN_DRAFT_STATUS`

## Publish Schedule

Only `ADMIN` and `MANAGER` can publish approved schedules.

```http
PATCH /api/v1/schedules/{scheduleId}/publish
```

Errors:

* `403 ACCESS_DENIED`
* `409 SCHEDULE_NOT_APPROVED`

## Get My Role Published Schedule

```http
GET /api/v1/schedules/my-role?weekStartDate=2026-04-06
```

Access:

* `EMPLOYEE`

Returns the published schedule for the authenticated employee's role.

Example:

* If the authenticated employee is a `WAITER`, return all published waiter assignments.
* If the authenticated employee is a `RUNNER`, return all published runner assignments.
* If the authenticated employee is a `BARTENDER`, return all published bartender assignments.

Employees cannot request another role's schedule directly.

Response:

```json
{
  "weekStartDate": "2026-04-06",
  "employeeRole": "WAITER",
  "status": "PUBLISHED",
  "assignments": [
    {
      "assignmentId": "uuid",
      "shiftId": "uuid",
      "employeeId": "uuid",
      "employeeName": "John Doe",
      "date": "2026-04-06",
      "startTime": "17:00",
      "endTime": "23:00",
      "employeeRole": "WAITER"
    }
  ]
}
```

# 7. Leave API

## Create Leave Request

```http
POST /api/v1/leave-requests
```

Access:

* `EMPLOYEE` can create their own leave requests.
* `ADMIN` and `MANAGER` can create leave requests on behalf of employees.

Request:

```json
{
  "employeeId": "uuid",
  "leaveType": "VACATION",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "reason": "Family trip"
}
```

Response:

```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "leaveType": "VACATION",
  "startDate": "2026-04-10",
  "endDate": "2026-04-12",
  "status": "PENDING"
}
```

## Approve Leave Request

```http
PATCH /api/v1/leave-requests/{leaveRequestId}/approve
```

Access:

* `ADMIN`
* `MANAGER`

## Reject Leave Request

```http
PATCH /api/v1/leave-requests/{leaveRequestId}/reject
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "reason": "Insufficient staffing coverage."
}
```

## List Leave Requests

```http
GET /api/v1/leave-requests?status=PENDING
```

Access:

* `ADMIN` and `MANAGER` can view all leave requests.
* `EMPLOYEE` can view only their own leave requests.

# 8. Shift Swap API

## Request Shift Swap

```http
POST /api/v1/swap-requests
```

Access:

* `EMPLOYEE`

Request:

```json
{
  "shiftAssignmentId": "uuid",
  "targetEmployeeId": "uuid",
  "reason": "Personal appointment"
}
```

Response:

```json
{
  "id": "uuid",
  "shiftAssignmentId": "uuid",
  "requestingEmployeeId": "uuid",
  "targetEmployeeId": "uuid",
  "status": "PENDING_COWORKER_ACCEPTANCE"
}
```

## Accept Swap

```http
PATCH /api/v1/swap-requests/{swapRequestId}/accept
```

Access:

* Target `EMPLOYEE`

## Reject Swap

```http
PATCH /api/v1/swap-requests/{swapRequestId}/reject
```

Access:

* Target `EMPLOYEE`
* `ADMIN`
* `MANAGER`

## Manager Approve Swap

```http
PATCH /api/v1/swap-requests/{swapRequestId}/manager-approve
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `409 SWAP_VIOLATES_AVAILABILITY`
* `409 SWAP_CREATES_OVERLAP`
* `409 WEEKLY_HOUR_LIMIT_EXCEEDED`
* `409 EMPLOYEE_ROLE_MISMATCH`

# 9. Holiday API

## Create Holiday

```http
POST /api/v1/holidays
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "name": "Good Friday",
  "date": "2026-04-03",
  "countryCode": "DE",
  "region": "Hamburg"
}
```

## List Holidays

```http
GET /api/v1/holidays?countryCode=DE&year=2026
```

Access:

* `ADMIN`
* `MANAGER`

## Delete Holiday

```http
DELETE /api/v1/holidays/{holidayId}
```

Access:

* `ADMIN`
* `MANAGER`

# 10. Notification API

## List My Notifications

```http
GET /api/v1/notifications/me
```

Access:

* `EMPLOYEE`
* `MANAGER`
* `ADMIN`

Response:

```json
[
  {
    "id": "uuid",
    "type": "SCHEDULE_PUBLISHED",
    "title": "New schedule published",
    "message": "Your schedule for week 2026-04-06 has been published.",
    "read": false,
    "createdAt": "2026-04-01T10:00:00Z"
  }
]
```

## Mark Notification As Read

```http
PATCH /api/v1/notifications/{notificationId}/read
```

Access:

* Notification owner

# Status Values

## Schedule Status

```text
DRAFT
APPROVED
REJECTED
PUBLISHED
```

## Leave Request Status

```text
PENDING
APPROVED
REJECTED
CANCELLED
```

## Swap Request Status

```text
PENDING_COWORKER_ACCEPTANCE
PENDING_MANAGER_APPROVAL
APPROVED
REJECTED
CANCELLED
```

## Employment Type

```text
FULL_TIME
PART_TIME
MINI_JOB
```

## Employee Role

```text
WAITER
RUNNER
BARTENDER
```

## System Role

```text
ADMIN
MANAGER
EMPLOYEE
```
