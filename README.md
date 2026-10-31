# Employee Management System 2.0

A role-based employee management backend built with Spring Boot. It covers JWT authentication, employee and department management, attendance tracking and leave approval, with pagination, sorting and filtering.

## Tech stack

- Java 25, Spring Boot 4.1.x, Maven
- Spring Web MVC, Spring Data JPA (Hibernate), Spring Security, Bean Validation
- JWT (jjwt 0.12.6), BCrypt password hashing
- H2 (in-memory) for development, PostgreSQL for production
- springdoc-openapi (Swagger UI)
- JUnit 5 and MockMvc integration tests

## Features

- **Authentication:** login returns a JWT. Registration is admin-only, so nobody can self-assign the admin role.
- **Roles:** `ADMIN`, `MANAGER`, `EMPLOYEE`, enforced with `@PreAuthorize` plus service-level ownership and team checks.
- **Employees:** profile, admin CRUD, manager and department assignment, paged list with search, department filter and sorting.
- **Departments:** CRUD (admin), read (everyone), live employee counts.
- **Attendance:** check-in and check-out (late after 09:30), own history, team history for managers.
- **Leave:** apply (weekdays only, balance and overlap checks), cancel, approve or reject by the employee's manager or an admin, balance deducted on approval.
- **Errors:** consistent JSON error responses from a global exception handler.

## Role rules

| Area | Admin | Manager | Employee |
|---|---|---|---|
| Register users | Yes | No | No |
| Employee list | All | Own team | No |
| View an employee | Any | Self and team | Self only |
| Edit employee, assign manager and department, delete | Yes | No | No |
| Edit own name and phone | Yes | Yes | Yes |
| Create, edit, delete departments | Yes | No | No |
| Attendance history of others | Any | Own team | No |
| Pending leave list, approve or reject | All | Own team | No |
| Apply for or cancel own leave | Yes | Yes | Yes |

Nobody can approve or reject their own leave request.

## Getting started

### Requirements

- JDK 25 (JDK 21 also works if you change `java.version` in `pom.xml`)
- Maven, or IntelliJ IDEA

### Run

```
mvn spring-boot:run
```

Or run `EmsApplication` from your IDE. The app starts on `http://localhost:8080` with the `dev` profile, using an in-memory H2 database.

### Development data

H2 is in memory, so data resets on every restart. On startup in `dev`, a seed admin and an "Engineering" department are created:

| Email | Password | Role |
|---|---|---|
| `admin@company.com` | `Admin@123` | ADMIN |

These credentials are for development only. The seeder does not run under the `prod` profile.

### Useful URLs

| URL | Purpose |
|---|---|
| `http://localhost:8080/swagger-ui.html` | Interactive API docs |
| `http://localhost:8080/h2-console` | Database console (JDBC URL `jdbc:h2:mem:emsdb`, user `sa`, blank password) |

## Using the API

1. `POST /api/auth/login` with an email and password to get a token.
2. In Swagger UI, click **Authorize** and paste the token. For other clients, send `Authorization: Bearer <token>`.
3. As admin, create users with `POST /api/auth/register`.

## Endpoints

### Auth
| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Admin |

### Employees
| Method | Path | Access |
|---|---|---|
| GET | `/api/employees` | Admin, Manager. Params: `page`, `size`, `sort`, `search`, `departmentId` |
| GET | `/api/employees/{id}` | Admin, or self or team |
| GET, PUT | `/api/employees/me` | Any logged-in user |
| PUT | `/api/employees/{id}` | Admin |
| PUT | `/api/employees/{id}/assignment` | Admin |
| DELETE | `/api/employees/{id}` | Admin |

Sortable fields: `id`, `firstName`, `lastName`, `designation`, `salary`, `joiningDate`. Maximum page size is 100.

### Departments
| Method | Path | Access |
|---|---|---|
| GET | `/api/departments`, `/api/departments/{id}` | Any logged-in user |
| POST | `/api/departments` | Admin |
| PUT, DELETE | `/api/departments/{id}` | Admin |

### Attendance
| Method | Path | Access |
|---|---|---|
| POST | `/api/attendance/check-in` | Any logged-in user |
| POST | `/api/attendance/check-out` | Any logged-in user |
| GET | `/api/attendance/me` | Any logged-in user. Optional `from`, `to` (default: last 30 days) |
| GET | `/api/attendance/employee/{id}` | Admin, Manager (own team) |

### Leave
| Method | Path | Access |
|---|---|---|
| POST | `/api/leaves` | Any logged-in user |
| GET | `/api/leaves/me` | Any logged-in user |
| GET | `/api/leaves/pending` | Admin, Manager |
| PUT | `/api/leaves/{id}/approve`, `/reject` | Admin, or the employee's manager |
| PUT | `/api/leaves/{id}/cancel` | The requester (pending only) |

## Error format

```json
{
  "timestamp": "2026-10-31T10:30:00Z",
  "status": 403,
  "error": "Forbidden",
  "message": "You do not have permission to do this",
  "fieldErrors": null
}
```

Validation failures return `400` with `fieldErrors` naming each invalid field.

## Configuration

| Property | Purpose | Default |
|---|---|---|
| `app.jwt.secret` (env `JWT_SECRET`) | Token signing key, at least 32 characters | dev placeholder |
| `app.jwt.expiration-ms` | Token lifetime | 86400000 (24 hours) |
| `spring.profiles.active` | `dev` or `prod` | `dev` |

For production, use the `prod` profile and set these environment variables: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`.

## Tests

```
mvn test
```

`EmsApiTests` runs integration tests through MockMvc covering authentication, role rules, employees, departments, attendance, leave and paging. Each test creates its own users, so tests can run in any order.

## Project structure

```
com.company.ems
├── config       security, OpenAPI, dev data seeding
├── controller   REST endpoints
├── service      business rules
├── repository   Spring Data JPA repositories
├── entity       JPA entities and enums
├── dto          request and response records
├── exception    global error handling
└── security     JWT service, filter, user details
```

## Known limitations

- Employees are hard-deleted. Anyone with attendance or leave history cannot be deleted (409). A deactivate flag would be a natural next step.
- All leave types share a single balance of 20 days.
- Attendance uses the server's clock and time zone.
