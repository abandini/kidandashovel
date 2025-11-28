/**
 * Validation utilities
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (US format)
 */
export function isValidPhone(phone: string): boolean {
  // Accept various formats: (123) 456-7890, 123-456-7890, 1234567890
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}

/**
 * Format phone number to standard format
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `(${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Validate password strength
 * - At least 8 characters
 * - At least one letter
 * - At least one number
 */
export function isValidPassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  return { valid: true };
}

/**
 * Validate age is within teen range (13-17)
 */
export function isValidTeenAge(age: number): boolean {
  return Number.isInteger(age) && age >= 13 && age <= 17;
}

/**
 * Validate ZIP code format
 */
export function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip);
}

/**
 * Validate rating (1-5)
 */
export function isValidRating(rating: number): boolean {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5;
}

/**
 * Sanitize user input (basic XSS prevention)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate service type
 */
export function isValidServiceType(serviceType: string): boolean {
  const validTypes = ['driveway', 'walkway', 'car_brushing', 'combo'];
  return validTypes.includes(serviceType);
}

/**
 * Validate price (positive number, reasonable range)
 */
export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price > 0 && price <= 500;
}
