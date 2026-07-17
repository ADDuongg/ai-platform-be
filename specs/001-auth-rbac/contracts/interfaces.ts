/**
 * Thin FE client interface for Auth + RBAC.
 * Method signatures only — FE implements the HTTP client against `auth-api.yaml` + `types.ts`.
 */

import type {
  AuthTokensResponse,
  ChangePasswordRequest,
  CreateUserRequest,
  CurrentUserResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  PermissionListResponse,
  ResetPasswordRequest,
  RoleListResponse,
  RoleResponse,
  UpdateRolePermissionsRequest,
  UpdateUserRequest,
  UpdateUserRolesRequest,
  UserListQuery,
  UserListResponse,
  UserResponse,
} from './types';

/** Base path: `/api/v1` */
export interface AuthApiClient {
  // Auth (public)
  login(body: LoginRequest): Promise<AuthTokensResponse>;
  refresh(): Promise<AuthTokensResponse>;
  forgotPassword(body: ForgotPasswordRequest): Promise<MessageResponse>;
  resetPassword(body: ResetPasswordRequest): Promise<MessageResponse>;

  // Auth (Bearer)
  logout(): Promise<MessageResponse>;
  logoutAll(): Promise<MessageResponse>;
  me(): Promise<CurrentUserResponse>;
  changePassword(body: ChangePasswordRequest): Promise<MessageResponse>;

  // Users (Bearer + permissions)
  listUsers(query?: UserListQuery): Promise<UserListResponse>;
  createUser(body: CreateUserRequest): Promise<UserResponse>;
  getUser(id: string): Promise<UserResponse>;
  updateUser(id: string, body: UpdateUserRequest): Promise<UserResponse>;
  deleteUser(id: string): Promise<MessageResponse>;
  updateUserRoles(id: string, body: UpdateUserRolesRequest): Promise<UserResponse>;

  // Roles (Bearer + permissions)
  listRoles(): Promise<RoleListResponse>;
  listPermissions(): Promise<PermissionListResponse>;
  updateRolePermissions(
    roleCode: string,
    body: UpdateRolePermissionsRequest,
  ): Promise<RoleResponse>;
}
