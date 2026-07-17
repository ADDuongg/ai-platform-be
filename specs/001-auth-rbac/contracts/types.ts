/**
 * FE / client contract types for Auth + RBAC.
 * Aligned with `auth-api.yaml` and the Nest success/error envelopes.
 * Do not import NestJS / TypeORM types here.
 */

// ─── Shared enums & literals ────────────────────────────────────────────────

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type RoleCode =
  | 'super_admin'
  | 'admin'
  | 'designer'
  | 'operator'
  | 'viewer';

/** Permission codes use `resource:action` (see OpenAPI / seed matrix). */
export type PermissionCode = string;

export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_INACTIVE'
  | 'INVALID_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_INVALID'
  | 'REFRESH_TOKEN_EXPIRED'
  | 'REFRESH_TOKEN_REUSED'
  | 'PASSWORD_MISMATCH'
  | 'PASSWORD_RESET_TOKEN_INVALID'
  | 'PASSWORD_RESET_TOKEN_EXPIRED'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'USER_ALREADY_EXISTS'
  | 'ROLE_NOT_FOUND'
  | 'CANNOT_REMOVE_LAST_SUPER_ADMIN'
  | 'CANNOT_ASSIGN_SUPER_ADMIN'
  | 'VALIDATION_ERROR'
  | 'TOO_MANY_REQUESTS'
  | string;

// ─── API envelopes (what the HTTP client actually receives) ─────────────────

export interface ApiErrorBody {
  code: AuthErrorCode;
  message: string;
  details: unknown | null;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorBody;
  timestamp: string;
  path: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
}

// ─── Auth transport notes for FE ────────────────────────────────────────────

/**
 * Access token: send as `Authorization: Bearer <accessToken>`.
 * Refresh token: HTTP-only cookie `refresh_token` (default name); path `/api/v1/auth`.
 * Browser clients must use `credentials: 'include'` on refresh/logout calls.
 */
export const AUTH_TRANSPORT = {
  accessHeader: 'Authorization',
  accessScheme: 'Bearer',
  refreshCookieName: 'refresh_token',
  refreshCookiePath: '/api/v1/auth',
} as const;

// ─── Auth request / response payloads (OpenAPI schemas) ─────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus;
  roles: RoleCode[] | string[];
  permissions: PermissionCode[];
  lastLoginAt?: string | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  tokenType?: 'Bearer' | string;
  /** Access token lifetime in seconds */
  expiresIn: number;
  user: CurrentUserResponse;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface MessageResponse {
  message: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
  /** Omit to default to `viewer` */
  roleCodes?: RoleCode[] | string[];
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

export interface UpdateUserRolesRequest {
  roleCodes: Array<RoleCode | string>;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: UserStatus | string;
  roles: Array<RoleCode | string>;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UserListQuery {
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  data: UserResponse[];
  meta: PaginationMeta;
}

// ─── Roles & permissions ────────────────────────────────────────────────────

export interface RoleResponse {
  code: RoleCode | string;
  name: string;
  description: string | null;
  permissions: PermissionCode[];
}

export interface PermissionResponse {
  code: PermissionCode;
  resource: string;
  action: string;
  description?: string;
}

export interface UpdateRolePermissionsRequest {
  permissionCodes: PermissionCode[];
}

export interface RoleListResponse {
  data: RoleResponse[];
}

export interface PermissionListResponse {
  data: PermissionResponse[];
}

// ─── Typed success wrappers (convenience for FE) ────────────────────────────

export type LoginSuccess = ApiSuccessResponse<AuthTokensResponse>;
export type RefreshSuccess = ApiSuccessResponse<AuthTokensResponse>;
export type MeSuccess = ApiSuccessResponse<CurrentUserResponse>;
export type MessageSuccess = ApiSuccessResponse<MessageResponse>;
export type UserSuccess = ApiSuccessResponse<UserResponse>;
export type UserListSuccess = ApiSuccessResponse<UserListResponse>;
export type RoleListSuccess = ApiSuccessResponse<RoleListResponse>;
export type PermissionListSuccess = ApiSuccessResponse<PermissionListResponse>;
