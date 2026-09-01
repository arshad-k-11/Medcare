import { NextResponse } from 'next/server';
import { ZodError, type ZodTypeAny, type z } from 'zod';
import { getSessionUser, type SessionUser } from './session';
import { can, type Capability } from './rbac';
import { rateLimit, type LIMITS } from './rate-limit';
import { audit } from './audit';
import { log } from './log';
import { PAGE_SIZE_DEFAULT, PAGE_SIZE_MAX, type Role } from './constants';

/**
 * Route-handler plumbing shared by every endpoint: one error envelope, one pagination
 * shape, one place where authentication and capability checks happen. Handlers that skip
 * these helpers are the ones that end up shipping an authorisation hole.
 */

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'CONFLICT'
  | 'UNAVAILABLE'
  | 'INTERNAL';

const STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  RATE_LIMITED: 429,
  CONFLICT: 409,
  UNAVAILABLE: 503,
  INTERNAL: 500,
};

export class ApiError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorResponse(error: ApiError): NextResponse {
  const headers = new Headers();
  if (error.retryAfterSeconds) headers.set('Retry-After', String(error.retryAfterSeconds));
  return NextResponse.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    { status: STATUS[error.code], headers },
  );
}

export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Wraps a handler so thrown ApiErrors and zod failures become the standard envelope and
 * unexpected errors never leak a stack trace or a database message to the client.
 */
export function handler(fn: (request: Request, context: never) => Promise<NextResponse>) {
  return async (request: Request, context: never): Promise<NextResponse> => {
    try {
      return await fn(request, context);
    } catch (error) {
      if (error instanceof ApiError) return errorResponse(error);
      if (error instanceof ZodError) return errorResponse(zodToApiError(error));
      log.error('api.unhandled', {
        url: new URL(request.url).pathname,
        method: request.method,
        error: error instanceof Error ? error.message : String(error),
      });
      return errorResponse(
        new ApiError('INTERNAL', 'Something went wrong on our side. Please try again.'),
      );
    }
  };
}

export function zodToApiError(error: ZodError): ApiError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || 'form';
    if (!fields[path]) fields[path] = issue.message;
  }
  return new ApiError('VALIDATION_ERROR', 'Please check the highlighted fields.', fields);
}

// --- Authentication / authorisation ---------------------------------------

export async function requireUser(roles?: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError('UNAUTHENTICATED', 'Please sign in to continue.');
  if (roles && !roles.includes(user.role)) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'authz.role.denied',
      entity: 'User',
      entityId: user.id,
      outcome: 'DENIED',
      metadata: { required: roles },
    });
    throw new ApiError('FORBIDDEN', 'Your account does not have access to this area.');
  }
  return user;
}

export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    await audit({
      actorUserId: user.id,
      actorRole: user.role,
      action: 'authz.capability.denied',
      entity: 'Capability',
      entityId: capability,
      outcome: 'DENIED',
    });
    throw new ApiError('FORBIDDEN', 'Your account does not have access to this action.');
  }
  return user;
}

export async function enforceRateLimit(
  bucket: keyof typeof LIMITS,
  identity: string | null,
  request: Request,
): Promise<void> {
  const result = await rateLimit(bucket, identity, new Headers(request.headers));
  if (!result.ok) {
    throw new ApiError(
      'RATE_LIMITED',
      'Too many attempts. Please wait a moment and try again.',
      undefined,
      result.retryAfterSeconds,
    );
  }
}

// --- Input parsing --------------------------------------------------------

export async function parseBody<S extends ZodTypeAny>(
  request: Request,
  schema: S,
): Promise<z.infer<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Expected a JSON body.');
  }
  const result = schema.safeParse(raw);
  if (!result.success) throw zodToApiError(result.error);
  return result.data;
}

export function parseQuery<S extends ZodTypeAny>(request: Request, schema: S): z.infer<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const result = schema.safeParse(params);
  if (!result.success) throw zodToApiError(result.error);
  return result.data;
}

// --- Pagination -----------------------------------------------------------

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function pagination(input: { page?: number; pageSize?: number }) {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, input.pageSize ?? PAGE_SIZE_DEFAULT));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
): Paginated<T> {
  return {
    data,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
