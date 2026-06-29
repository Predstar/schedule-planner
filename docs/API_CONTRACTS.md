# API_CONTRACTS.md

Base URL:

```text
/api/v1
```

All request and response bodies must use DTOs.

Business rules, role definitions, schedule visibility, and deferred features are defined in `docs/ARCHITECTURE.md`.

## Common Error Response

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "statusCode": 400,
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

## Get Current User

```http
GET /api/v1/auth/me
```

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

```http
POST /api/v1/users/managers
```

Access:

* `ADMIN`

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

```http
POST /api/v1/users/employees
```

Access:

* `ADMIN`
* `MANAGER`

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
* `409 EMPLOYEE_USER_ALREADY_EXISTS`
* `409 EMPLOYEE_EMAIL_MISMATCH`

# 3. Employee API

## Create Employee Profile

```http
POST /api/v1/employees
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@restaurant.com",
  "phone": "+49123456789",
  "employmentType": "PART_TIME",
  "employeeRole": "WAITER",
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

* `ADMIN`
* `MANAGER`
* `EMPLOYEE` only for own profile

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

Request:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+49123456789",
  "employmentType": "PART_TIME",
  "employeeRole": "WAITER",
  "weeklyHourLimit": 25,
  "active": true
}
```

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

* `EMPLOYEE` for own availability
* `ADMIN`
* `MANAGER`

Deadline rule:

* `EMPLOYEE` self-service submission is allowed only before `weekStartDate - 2 days at 00:00` in the `Europe/Berlin` timezone.
* `ADMIN` and `MANAGER` may submit on behalf of an employee at any time.

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

* `EMPLOYEE` for own availability before deadline
* `ADMIN`
* `MANAGER`

Deadline rule:

* `EMPLOYEE` self-service updates are allowed only before `weekStartDate - 2 days at 00:00` in the `Europe/Berlin` timezone.
* `ADMIN` and `MANAGER` may update on behalf of an employee at any time.

## Get Employee Availability

```http
GET /api/v1/employees/{employeeId}/availability?weekStartDate=2026-04-06
```

Access:

* `ADMIN`
* `MANAGER`
* `EMPLOYEE` only for own availability

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

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`

## List Shifts

```http
GET /api/v1/shifts?from=2026-04-06&to=2026-04-12
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`

## Update Shift

```http
PUT /api/v1/shifts/{shiftId}
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `400 VALIDATION_ERROR`
* `403 ACCESS_DENIED`
* `404 SHIFT_NOT_FOUND`

## Delete Shift

```http
DELETE /api/v1/shifts/{shiftId}
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `403 ACCESS_DENIED`
* `404 SHIFT_NOT_FOUND`

# 6. Schedule API

## Create Draft Schedule

```http
POST /api/v1/schedules
```

Access:

* `ADMIN`
* `MANAGER`

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
  "assignments": []
}
```

## Get Weekly Schedule

```http
GET /api/v1/schedules?weekStartDate=2026-04-06
```

Access:

* `ADMIN`
* `MANAGER`
* `EMPLOYEE`

Visibility follows `docs/ARCHITECTURE.md`.

## Add Assignment To Draft Schedule

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

* `409 SCHEDULE_NOT_EDITABLE`
* `409 EMPLOYEE_ROLE_MISMATCH`
* `409 EMPLOYEE_UNAVAILABLE`
* `409 SHIFT_OVERLAP`
* `409 WEEKLY_HOUR_LIMIT_EXCEEDED`

## Remove Assignment From Draft Schedule

```http
DELETE /api/v1/schedules/{scheduleId}/assignments/{assignmentId}
```

Access:

* `ADMIN`
* `MANAGER`

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

## Approve Schedule

```http
PATCH /api/v1/schedules/{scheduleId}/approve
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `409 SCHEDULE_NOT_IN_DRAFT_STATUS`

## Reject Schedule

```http
PATCH /api/v1/schedules/{scheduleId}/reject
```

Access:

* `ADMIN`
* `MANAGER`

Request:

```json
{
  "reason": "Too many uncovered shifts."
}
```

## Publish Schedule

```http
PATCH /api/v1/schedules/{scheduleId}/publish
```

Access:

* `ADMIN`
* `MANAGER`

Errors:

* `409 SCHEDULE_NOT_APPROVED`

## Get My Role Published Schedule

```http
GET /api/v1/schedules/my-role?weekStartDate=2026-04-06
```

Access:

* `EMPLOYEE`

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

# Status Values

## Schedule Status

```text
DRAFT
APPROVED
REJECTED
PUBLISHED
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
