import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser, JwtPayload, Permissions } from '@common/decorators';
import { PERMISSIONS } from '@common/constants';

import { CreateUserDto } from '../dto/create-user.dto';
import { ListUsersQueryDto } from '../dto/list-users-query.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UsersService } from '../services/users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'List users' })
  async list(@Query() query: ListUsersQueryDto) {
    return this.usersService.list(query.page, query.limit);
  }

  @Post()
  @Permissions(PERMISSIONS.USERS.CREATE)
  @ApiOperation({ summary: 'Provision user (admin only; no public register)' })
  @ApiCreatedResponse({ type: UserResponseDto })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user.roles);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.USERS.READ)
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiOkResponse({ type: UserResponseDto })
  async findById(@Param('id', ParseUUIDPipe) id: string): Promise<UserResponseDto> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Permissions(PERMISSIONS.USERS.UPDATE)
  @ApiOperation({ summary: 'Update user profile or status' })
  @ApiOkResponse({ type: UserResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USERS.DELETE)
  @ApiOperation({ summary: 'Soft-delete user' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.usersService.softDelete(id);
  }

  @Patch(':id/roles')
  @Permissions(PERMISSIONS.ROLES.MANAGE)
  @ApiOperation({ summary: 'Replace user role assignments' })
  @ApiOkResponse({ type: UserResponseDto })
  async updateRoles(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRolesDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<UserResponseDto> {
    return this.usersService.updateRoles(id, dto.roleCodes, user, this.requestMeta(req));
  }

  private requestMeta(req: Request): { ip: string | null; userAgent: string | null } {
    return {
      ip: req.ip ?? req.socket.remoteAddress ?? null,
      userAgent: req.get('user-agent') ?? null,
    };
  }
}
