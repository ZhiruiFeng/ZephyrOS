import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { jsonWithCors } from '@/lib/utils/security';

export interface ValidatedRequest<TBody = any, TQuery = any, TParams = any> extends NextRequest {
  validatedBody?: TBody;
  validatedQuery?: TQuery;
  validatedParams?: TParams;
}

export interface ValidationMiddlewareOptions {
  bodySchema?: ZodSchema;
  querySchema?: ZodSchema;
  paramsSchema?: ZodSchema;
  customErrorHandler?: (request: NextRequest, error: ZodError) => NextResponse;
  customErrorMessage?: string;
  skipValidationOn?: string[]; // HTTP methods to skip validation
}

/**
 * Validation middleware that validates request body, query parameters, and route parameters
 */
export function withValidation<THandler extends (request: ValidatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  options: ValidationMiddlewareOptions = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  const {
    bodySchema,
    querySchema,
    paramsSchema,
    customErrorHandler,
    customErrorMessage = 'Validation failed',
    skipValidationOn = []
  } = options;

  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      // Skip validation for certain HTTP methods if specified
      if (skipValidationOn.includes(request.method)) {
        return handler(request as ValidatedRequest, ...args);
      }

      const validatedRequest = request as ValidatedRequest;
      const validationErrors: Array<{ field: string; errors: any[] }> = [];

      // Validate request body
      if (bodySchema && (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH')) {
        try {
          const body = await request.clone().json();
          const result = bodySchema.safeParse(body);

          if (!result.success) {
            validationErrors.push({ field: 'body', errors: result.error.errors });
          } else {
            validatedRequest.validatedBody = result.data;
          }
        } catch (error) {
          validationErrors.push({ field: 'body', errors: [{ message: 'Invalid JSON in request body' }] });
        }
      }

      // Validate query parameters
      if (querySchema) {
        try {
          const { searchParams } = new URL(request.url);
          const queryObject = Object.fromEntries(searchParams);
          const result = querySchema.safeParse(queryObject);

          if (!result.success) {
            validationErrors.push({ field: 'query', errors: result.error.errors });
          } else {
            validatedRequest.validatedQuery = result.data;
          }
        } catch (error) {
          validationErrors.push({ field: 'query', errors: [{ message: 'Invalid query parameters' }] });
        }
      }

      // Validate route parameters (from ...args or URL)
      if (paramsSchema && args.length > 0) {
        try {
          // Assume the first argument after request contains route params
          const params = args[0]?.params || {};
          const result = paramsSchema.safeParse(params);

          if (!result.success) {
            validationErrors.push({ field: 'params', errors: result.error.errors });
          } else {
            validatedRequest.validatedParams = result.data;
          }
        } catch (error) {
          validationErrors.push({ field: 'params', errors: [{ message: 'Invalid route parameters' }] });
        }
      }

      // Handle validation errors
      if (validationErrors.length > 0) {
        if (customErrorHandler) {
          const zodError = new ZodError(validationErrors.flatMap(ve => ve.errors));
          return customErrorHandler(request, zodError);
        }

        return jsonWithCors(request, {
          error: customErrorMessage,
          details: validationErrors
        }, 400);
      }

      // Call the actual handler with validated data
      return await handler(validatedRequest, ...args);
    } catch (error) {
      console.error('Validation middleware error:', error);
      return jsonWithCors(request, { error: 'Validation middleware failed' }, 500);
    }
  };
}

/**
 * Body validation middleware for POST/PUT/PATCH requests
 */
export function withBodyValidation<TBody = any>(
  handler: (request: ValidatedRequest<TBody>, ...args: any[]) => Promise<NextResponse>,
  schema: ZodSchema<TBody>,
  options: Omit<ValidationMiddlewareOptions, 'bodySchema'> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, { ...options, bodySchema: schema });
}

/**
 * Query validation middleware
 */
export function withQueryValidation<TQuery = any>(
  handler: (request: ValidatedRequest<any, TQuery>, ...args: any[]) => Promise<NextResponse>,
  schema: ZodSchema<TQuery>,
  options: Omit<ValidationMiddlewareOptions, 'querySchema'> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, { ...options, querySchema: schema });
}

/**
 * Route parameters validation middleware
 */
export function withParamsValidation<TParams = any>(
  handler: (request: ValidatedRequest<any, any, TParams>, ...args: any[]) => Promise<NextResponse>,
  schema: ZodSchema<TParams>,
  options: Omit<ValidationMiddlewareOptions, 'paramsSchema'> = {}
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, { ...options, paramsSchema: schema });
}

/**
 * Higher-order function for creating validation middleware with custom options
 */
export function createValidationMiddleware(options: ValidationMiddlewareOptions) {
  return function <THandler extends (request: ValidatedRequest, ...args: any[]) => Promise<NextResponse>>(
    handler: THandler
  ): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
    return withValidation(handler, options);
  };
}

/**
 * Validation middleware for GET requests (query parameters only)
 */
export function withGetValidation<TQuery = any>(
  handler: (request: ValidatedRequest<any, TQuery>, ...args: any[]) => Promise<NextResponse>,
  querySchema: ZodSchema<TQuery>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, {
    querySchema,
    skipValidationOn: ['OPTIONS'] // Always skip OPTIONS for CORS
  });
}

/**
 * Validation middleware for POST requests (body and optional query)
 */
export function withPostValidation<TBody = any, TQuery = any>(
  handler: (request: ValidatedRequest<TBody, TQuery>, ...args: any[]) => Promise<NextResponse>,
  bodySchema: ZodSchema<TBody>,
  querySchema?: ZodSchema<TQuery>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, {
    bodySchema,
    querySchema,
    skipValidationOn: ['OPTIONS']
  });
}

/**
 * Validation middleware for PUT/PATCH requests
 */
export function withUpdateValidation<TBody = any, TParams = any>(
  handler: (request: ValidatedRequest<TBody, any, TParams>, ...args: any[]) => Promise<NextResponse>,
  bodySchema: ZodSchema<TBody>,
  paramsSchema?: ZodSchema<TParams>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, {
    bodySchema,
    paramsSchema,
    skipValidationOn: ['OPTIONS']
  });
}

/**
 * Validation middleware for DELETE requests (params only)
 */
export function withDeleteValidation<TParams = any>(
  handler: (request: ValidatedRequest<any, any, TParams>, ...args: any[]) => Promise<NextResponse>,
  paramsSchema: ZodSchema<TParams>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return withValidation(handler, {
    paramsSchema,
    skipValidationOn: ['OPTIONS']
  });
}

/**
 * Utility to extract validated data from request
 */
export function getValidatedData<TBody = any, TQuery = any, TParams = any>(
  request: ValidatedRequest<TBody, TQuery, TParams>
): {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
} {
  return {
    body: request.validatedBody,
    query: request.validatedQuery,
    params: request.validatedParams
  };
}

/**
 * Compose multiple validation middlewares
 */
export function composeValidation<THandler extends (request: ValidatedRequest, ...args: any[]) => Promise<NextResponse>>(
  handler: THandler,
  ...validationMiddlewares: Array<(handler: THandler) => (request: NextRequest, ...args: any[]) => Promise<NextResponse>>
): (request: NextRequest, ...args: any[]) => Promise<NextResponse> {
  return validationMiddlewares.reduce((wrappedHandler, middleware) => {
    return middleware(wrappedHandler as THandler) as any;
  }, handler as any);
}