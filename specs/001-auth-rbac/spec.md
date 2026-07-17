# Feature Specification: Authentication & Authorization (Auth + RBAC)

**Feature Branch**: `001-auth-rbac`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Provide user identity and access control for the AI Workflow Platform before opening Workflow / Agent / Execution APIs. Include account lifecycle, session/token management, and Role-Based Access Control with permission checks on every business API. Roles: super_admin, admin, designer, operator, viewer. Permissions use resource:action format. Out of scope: SSO/OAuth social login, multi-tenant org isolation, ABAC, MFA/Passkey."

## Clarifications

### Session 2026-07-14

- Q: Who can create new user accounts? → A: Admin/invite-only — no public self-registration; admins (or invite tokens) create accounts
- Q: Default role when provisioning a user with no roles specified? → A: Default to `viewer` only
- Q: How should refresh credentials be delivered to clients? → A: Hybrid — access in response body; refresh in HTTP-only cookie

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign In and Access Protected Platform (Priority: P1)

A registered user signs in with email and password, receives a short-lived access credential and a longer-lived refresh credential, then can call protected Platform APIs as themselves. When the access credential expires, they refresh it without signing in again. When they sign out, their session can no longer be used.

**Why this priority**: Without sign-in and session continuity, no other Platform feature is usable securely.

**Independent Test**: Create a user, sign in, call a protected “current user” endpoint successfully; wait/expire access credential, refresh successfully; sign out and confirm further use of old credentials fails.

**Acceptance Scenarios**:

1. **Given** a user with valid credentials and active status, **When** they sign in, **Then** they receive an access credential in the response body, a refresh credential in an HTTP-only cookie, and can retrieve their own profile.
2. **Given** a valid refresh cookie, **When** the user refreshes, **Then** they receive a new access credential in the body and a rotated refresh cookie; the previous refresh credential can no longer be reused.
3. **Given** a signed-in user, **When** they sign out, **Then** the refresh cookie is cleared/revoked and cannot refresh again.
4. **Given** no valid access credential, **When** a user calls a protected business API, **Then** access is denied as unauthenticated.
5. **Given** wrong password or unknown email, **When** a user attempts to sign in, **Then** access is denied without revealing which field was wrong, and the failure is auditable.

---

### User Story 2 - Enforce Permissions on Business Actions (Priority: P1)

An authenticated user’s allowed actions are determined by their assigned roles and the permissions those roles grant. The Platform denies actions the user is not permitted to perform, while allowing permitted ones. Health checks and public auth entry points remain reachable without authentication.

**Why this priority**: Auth without authorization cannot protect Workflow/Agent/Execution surfaces; permission enforcement is the gate for all Phase 1 features.

**Independent Test**: Assign a viewer-only user and a designer user; confirm viewer can read but cannot execute or mutate; designer can create/update workflows and execute; unauthenticated callers can still reach health and sign-in.

**Acceptance Scenarios**:

1. **Given** an authenticated user missing the required permission, **When** they attempt a protected action, **Then** access is denied as forbidden (distinct from unauthenticated).
2. **Given** an authenticated user with the required permission, **When** they attempt that action, **Then** authorization succeeds (business validation may still fail separately).
3. **Given** a user with multiple roles, **When** permissions are evaluated, **Then** they receive the union of permissions from all assigned roles.
4. **Given** public endpoints (sign-in, health, API docs), **When** called without credentials, **Then** they remain accessible.
5. **Given** seeded default roles, **When** the Platform is initialized, **Then** super_admin, admin, designer, operator, and viewer exist with the agreed default permission matrix.

---

### User Story 3 - Account Provisioning and Manage Own Security (Priority: P2)

An authorized admin provisions a new user account (no public self-registration). The new user can sign in once provisioned, view their own profile, change their password, and revoke all of their active sessions. Optionally, they can start a password-reset flow when they forget their password.

**Why this priority**: Account lifecycle and self-service security are required for real usage, but can follow core sign-in/authorization.

**Independent Test**: Admin creates a user; that user signs in, changes password, signs out of all sessions, and verifies other devices’ refresh credentials no longer work. Unauthenticated callers cannot create accounts via a public register endpoint.

**Acceptance Scenarios**:

1. **Given** an actor with permission to create users and an unused email, **When** they provision a user with a valid password (or invite) and no roles specified, **Then** an account is created with the `viewer` role and the user can sign in when status is eligible.
2. **Given** an actor with permission to create users, **When** they provision a user with one or more explicit roles, **Then** those roles are assigned instead of (not in addition to) the default `viewer` unless `viewer` is included.
3. **Given** an unauthenticated caller, **When** they attempt public self-registration, **Then** the Platform does not offer a public register path (or rejects it).
4. **Given** a signed-in user, **When** they change password with the correct current password, **Then** the new password works for sign-in and the old one does not; security event is audited.
5. **Given** a signed-in user with multiple active sessions, **When** they sign out of all sessions, **Then** all of their refresh credentials are revoked.
6. **Given** a user who forgot their password, **When** they request a reset, **Then** the system accepts the request without confirming whether the email exists, and a reset path is available (may be stubbed until mail delivery exists).

---

### User Story 4 - Administer Users and Roles (Priority: P2)

An authorized administrator lists users, views a user, updates profile/status, assigns roles (where permitted), and reviews available roles/permissions. Role–permission mapping changes are limited to the highest privilege role.

**Why this priority**: Needed to operate the Platform and assign least-privilege access; depends on Auth + RBAC core.

**Independent Test**: As admin, list users and update a user’s status; as super_admin, assign roles; as non-admin, confirm user-admin APIs are forbidden.

**Acceptance Scenarios**:

1. **Given** a user with user-read permission, **When** they list or view users, **Then** they see account metadata without password secrets.
2. **Given** a user with user-update permission, **When** they update another user’s profile or status (`active` | `inactive` | `suspended` | `pending`), **Then** the change persists and affects sign-in eligibility for non-active statuses.
3. **Given** a user with roles-manage permission, **When** they assign roles to a user, **Then** the user’s effective permissions update on subsequent authorization.
4. **Given** a non–super_admin admin, **When** they attempt to escalate themselves or others to super_admin or change role–permission mappings reserved for super_admin, **Then** the action is denied.
5. **Given** an authorized actor, **When** a user is soft-deleted, **Then** the user can no longer sign in and does not appear in default user listings.

---

### User Story 5 - Security Controls and Audit Trail (Priority: P3)

The Platform limits abuse of auth endpoints, locks out repeated failed sign-ins, and records security-relevant events (login success/fail, logout, role change, password change) without logging secrets or unnecessary personal data.

**Why this priority**: Hardens production readiness; valuable after core auth/RBAC works.

**Independent Test**: Exceed failed login threshold and observe lockout; confirm audit entries for login fail and role change; confirm responses/logs never include password or raw refresh tokens.

**Acceptance Scenarios**:

1. **Given** repeated failed sign-in attempts for an account, **When** the threshold is exceeded, **Then** further sign-in attempts are temporarily rejected even with the correct password until the lockout window ends.
2. **Given** auth-sensitive endpoints, **When** clients exceed rate limits, **Then** requests are throttled.
3. **Given** security events (login success/fail, logout, role change, password change), **When** they occur, **Then** an audit record is stored with event type and minimal metadata (no passwords, no raw tokens).

---

### Edge Cases

- Sign-in with correct password but `inactive`, `suspended`, or `pending` status → denied.
- Refresh with revoked, expired, or already-rotated token → denied; reuse of an already-rotated refresh token invalidates the token family when reuse detection is enabled.
- Concurrent refresh from two clients with the same refresh token → only one rotation succeeds; the other fails safely.
- User soft-deleted while sessions remain → refresh and access are rejected.
- Assigning/removing the last super_admin → prevented or required to leave at least one active super_admin.
- Register with duplicate email → rejected without leaking password hashes.
- Permission checks must not be bypassable by omitting role names in the credential if permissions are the source of truth for authorization.
- Password change while other sessions exist → other sessions remain until logout-all or natural expiry unless policy revokes them (default: require explicit logout-all; password change does not auto-revoke unless clarified).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to authenticate with email and password and receive a short-lived access credential in the response body plus a longer-lived refresh credential set as an HTTP-only cookie.
- **FR-002**: System MUST validate access credentials on every non-public business API and reject unauthenticated requests.
- **FR-003**: System MUST support refresh of access credentials using the refresh cookie, rotating the refresh credential (new HTTP-only cookie) so the previous one cannot be reused.
- **FR-004**: System MUST allow a user to revoke the current session (logout) and to revoke all of their sessions (logout-all), clearing the refresh cookie on logout of the current session.
- **FR-005**: System MUST expose a “current user” view for the authenticated principal (identity, roles, and effective permissions summary as needed by clients).
- **FR-006**: System MUST allow authenticated users to change their password when they provide the current password and a valid new password.
- **FR-007**: System MUST support a forgot/reset password flow; mail delivery MAY be stubbed in MVP while preserving a secure token-based reset contract.
- **FR-008**: System MUST NOT expose public self-registration. New accounts MUST be created only by authorized actors (admin provisioning and/or invite token flow).
- **FR-009**: System MUST store passwords only as irreversible hashes; passwords and raw refresh credentials MUST never appear in API responses or logs.
- **FR-010**: System MUST implement RBAC with roles `super_admin`, `admin`, `designer`, `operator`, and `viewer`, and allow a user to hold multiple roles.
- **FR-011**: System MUST model permissions as `resource:action` and authorize business APIs by required permission, not by hard-coded role checks in business services.
- **FR-012**: System MUST seed default roles and the default role→permission matrix at Platform initialization.
- **FR-013**: System MUST allow authorized actors to list/view users, update user profile and status, soft-delete users, and assign roles per permission rules.
- **FR-014**: System MUST allow authorized actors to list roles and permissions; only `super_admin` may change role–permission mappings.
- **FR-015**: System MUST keep health checks and API documentation publicly accessible without authentication.
- **FR-016**: System MUST apply stricter rate limiting to authentication entry points (sign-in, refresh, password reset, and any invite-accept path if present).
- **FR-017**: System MUST lock an account for a defined window after a configured number of consecutive failed sign-in attempts.
- **FR-018**: System MUST record audit events for login success/fail, logout, role changes, and password changes without logging secrets or unnecessary PII.
- **FR-019**: System MUST deny access for users whose status is not eligible to sign in (`inactive`, `suspended`, `pending`, or soft-deleted).
- **FR-020**: Auth and user/RBAC capabilities MUST be isolatable modules so future Workflow/Agent/Execution features depend only on shared auth guards/decorators, not on auth internals.
- **FR-021**: Account creation policy is admin/invite-only (resolved 2026-07-14); public self-registration is out of scope for this feature.
- **FR-022**: When a user is provisioned with no roles specified, the system MUST assign the `viewer` role by default. When one or more roles are explicitly provided, those roles MUST be assigned as specified (no automatic extra `viewer` unless listed).
- **FR-023**: Refresh credentials MUST be delivered only via HTTP-only cookies (not in response body). Access credentials MUST be delivered in the response body (not via cookie).

### Key Entities

- **User**: Platform account identity (email, display name, status, credential hash, lifecycle timestamps, soft-delete marker).
- **Role**: Named access bundle (`super_admin`, `admin`, `designer`, `operator`, `viewer`) with human-readable description.
- **Permission**: Fine-grained capability identified by `resource:action` (e.g., `workflows:execute`, `users:read`).
- **User–Role Assignment**: Many-to-many link between users and roles.
- **Role–Permission Mapping**: Many-to-many link defining which permissions a role grants.
- **Refresh Session**: Persisted hashed refresh credential bound to a user, with expiry, revocation, and optional client metadata (user agent, IP).
- **Auth Audit Event**: Security event record (actor, event type, minimal metadata, timestamp).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A valid user can sign in and retrieve their own profile in under 30 seconds in normal interactive use.
- **SC-002**: 100% of non-public business API calls without a valid access credential are rejected as unauthenticated in acceptance tests.
- **SC-003**: 100% of sampled permission-denied cases return forbidden (not unauthenticated) when the user is signed in but lacks permission.
- **SC-004**: After logout or refresh rotation, previously issued refresh credentials fail in 100% of replay attempts in acceptance tests.
- **SC-005**: Default five roles and the documented permission matrix are present after a clean Platform initialization with no manual data entry.
- **SC-006**: Password values and raw refresh credentials appear in 0 API responses and 0 audit/log samples reviewed in security checks.
- **SC-007**: After N consecutive failed sign-ins (configured threshold), the account remains locked for the configured window in 100% of test runs.
- **SC-008**: An operator/viewer cannot perform designer-only mutations in acceptance tests; a designer can perform allowed workflow actions once those APIs exist (authz hooks verified via permission checks on placeholder or user APIs until then).

## Assumptions

- Platform NestJS bootstrap (config, database, Redis, global guards scaffold, health, users scaffold) is already available and is a dependency of this feature.
- SSO / OAuth social login, organization multi-tenancy, ABAC, and MFA/Passkey are out of scope for this feature.
- Permission resources for Phase 1 include at least: `users`, `roles`, `workflows`, `agents`, `prompts`, `tools`, `executions` — even if some resource APIs are not built yet, permissions are seeded so later features can attach guards without reseeding.
- Access credential lifetime defaults to about 15 minutes; refresh lifetime defaults to about 7 days unless configuration overrides.
- Password hashing uses a modern one-way algorithm suitable for passwords (argon2 or bcrypt).
- Until a mailer exists, password-reset may generate/store a reset token and expose a confirm endpoint; email sending can be stubbed.
- Business services authorize via permission checks at the API boundary (guards/decorators), not by embedding role names in domain logic.
- Soft delete is used for users; hard delete is out of scope.
- At least one bootstrap super_admin account will be created via seed/env for initial operations, since public self-registration is disabled.
- Invite-token acceptance may be added later; MVP may ship admin-provisioned users only as long as FR-008 holds.
- Clients send the access credential via the standard Authorization mechanism; browsers send the refresh cookie automatically on refresh/logout calls (SameSite and secure cookie flags applied per environment).
