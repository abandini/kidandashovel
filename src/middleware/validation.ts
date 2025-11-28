import { createMiddleware } from 'hono/factory';
import type { Env } from '../types';
import * as validation from '../utils/validation';

/**
 * Validate request body against a schema
 */
export function validateBody<T>(schema: ValidationSchema<T>) {
  return createMiddleware<{
    Bindings: Env;
    Variables: {
      validatedBody: T;
    };
  }>(async (c, next) => {
    let body: unknown;

    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const errors = validateObject(body, schema);

    if (errors.length > 0) {
      return c.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        400
      );
    }

    c.set('validatedBody', body as T);
    await next();
  });
}

/**
 * Validation schema type
 */
export type ValidationSchema<T> = {
  [K in keyof T]: ValidationRule;
};

/**
 * Validation rule definition
 */
export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
  enum?: unknown[];
}

/**
 * Validate an object against a schema
 */
function validateObject(obj: unknown, schema: Record<string, ValidationRule>): string[] {
  const errors: string[] = [];

  if (typeof obj !== 'object' || obj === null) {
    return ['Request body must be an object'];
  }

  const data = obj as Record<string, unknown>;

  for (const [field, rule] of Object.entries(schema)) {
    const value = data[field];

    // Required check
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    // Skip validation if not provided and not required
    if (value === undefined || value === null) {
      continue;
    }

    // Type check
    if (rule.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rule.type) {
        errors.push(`${field} must be a ${rule.type}`);
        continue;
      }
    }

    // String validations
    if (typeof value === 'string') {
      if (rule.minLength !== undefined && value.length < rule.minLength) {
        errors.push(`${field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength !== undefined && value.length > rule.maxLength) {
        errors.push(`${field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${field} has invalid format`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push(`${field} must be at least ${rule.min}`);
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push(`${field} must be at most ${rule.max}`);
      }
    }

    // Enum check
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rule.enum.join(', ')}`);
    }

    // Custom validation
    if (rule.custom) {
      const result = rule.custom(value);
      if (typeof result === 'string') {
        errors.push(result);
      } else if (!result) {
        errors.push(`${field} is invalid`);
      }
    }
  }

  return errors;
}

/**
 * Common validation schemas
 */
export const schemas = {
  registration: {
    email: {
      required: true,
      type: 'string' as const,
      custom: (v: unknown) => (validation.isValidEmail(v as string) ? true : 'Invalid email format'),
    },
    password: {
      required: true,
      type: 'string' as const,
      custom: (v: unknown) => {
        const result = validation.isValidPassword(v as string);
        return result.valid ? true : result.message!;
      },
    },
    name: {
      required: true,
      type: 'string' as const,
      minLength: 2,
      maxLength: 100,
    },
  },

  login: {
    email: {
      required: true,
      type: 'string' as const,
    },
    password: {
      required: true,
      type: 'string' as const,
    },
  },

  jobCreate: {
    service_type: {
      required: true,
      type: 'string' as const,
      enum: ['driveway', 'walkway', 'car_brushing', 'combo'],
    },
    address: {
      required: true,
      type: 'string' as const,
      minLength: 5,
      maxLength: 200,
    },
    price_offered: {
      type: 'number' as const,
      min: 5,
      max: 500,
    },
    description: {
      type: 'string' as const,
      maxLength: 1000,
    },
  },

  rating: {
    rating: {
      required: true,
      type: 'number' as const,
      min: 1,
      max: 5,
    },
    review_text: {
      type: 'string' as const,
      maxLength: 1000,
    },
  },
};
