// Input validation utilities for A Kid and a Shovel

import type { ServiceType, EquipmentType, PaymentMethod, DrivewaySize, PropertyType } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validate user registration input
 */
export function validateRegistration(data: {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip?: string;
  type?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Email validation
  if (!data.email) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Invalid email format';
  }

  // Password validation
  if (!data.password) {
    errors.password = 'Password is required';
  } else if (data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Z]/.test(data.password)) {
    errors.password = 'Password must contain at least one uppercase letter';
  } else if (!/[a-z]/.test(data.password)) {
    errors.password = 'Password must contain at least one lowercase letter';
  } else if (!/[0-9]/.test(data.password)) {
    errors.password = 'Password must contain at least one number';
  }

  // Name validation
  if (!data.name) {
    errors.name = 'Name is required';
  } else if (data.name.length < 2) {
    errors.name = 'Name must be at least 2 characters';
  } else if (data.name.length > 100) {
    errors.name = 'Name must be less than 100 characters';
  }

  // Phone validation (optional but validated if provided)
  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  // Address validation
  if (!data.address) {
    errors.address = 'Address is required';
  }

  if (!data.city) {
    errors.city = 'City is required';
  }

  // ZIP validation
  if (!data.zip) {
    errors.zip = 'ZIP code is required';
  } else if (!/^\d{5}(-\d{4})?$/.test(data.zip)) {
    errors.zip = 'Invalid ZIP code format';
  }

  // Type validation
  if (!data.type) {
    errors.type = 'Account type is required';
  } else if (!['homeowner', 'teen', 'parent'].includes(data.type)) {
    errors.type = 'Invalid account type';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate teen-specific registration fields
 */
export function validateTeenRegistration(data: {
  age?: number;
  birth_date?: string;
  school_name?: string;
  parent_email?: string;
  parent_name?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Age validation
  if (data.age === undefined) {
    errors.age = 'Age is required';
  } else if (data.age < 13 || data.age > 17) {
    errors.age = 'Workers must be between 13 and 17 years old';
  }

  // School name (optional but encouraged)
  if (data.school_name && data.school_name.length > 200) {
    errors.school_name = 'School name must be less than 200 characters';
  }

  // Parent email validation
  if (!data.parent_email) {
    errors.parent_email = 'Parent/guardian email is required';
  } else if (!isValidEmail(data.parent_email)) {
    errors.parent_email = 'Invalid parent/guardian email format';
  }

  // Parent name validation
  if (!data.parent_name) {
    errors.parent_name = 'Parent/guardian name is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate job posting input
 */
export function validateJobPosting(data: {
  service_type?: string;
  address?: string;
  description?: string;
  price_offered?: number;
  scheduled_for?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  // Service type validation
  const validServices: ServiceType[] = ['driveway', 'walkway', 'car_brushing', 'salting', 'combo'];
  if (!data.service_type) {
    errors.service_type = 'Service type is required';
  } else if (!validServices.includes(data.service_type as ServiceType)) {
    errors.service_type = 'Invalid service type';
  }

  // Address validation
  if (!data.address) {
    errors.address = 'Address is required';
  }

  // Description validation (optional)
  if (data.description && data.description.length > 1000) {
    errors.description = 'Description must be less than 1000 characters';
  }

  // Price validation
  if (data.price_offered !== undefined) {
    if (data.price_offered < 5) {
      errors.price_offered = 'Minimum price is $5';
    } else if (data.price_offered > 500) {
      errors.price_offered = 'Maximum price is $500';
    }
  }

  // Scheduled time validation
  if (data.scheduled_for) {
    const scheduledDate = new Date(data.scheduled_for);
    if (isNaN(scheduledDate.getTime())) {
      errors.scheduled_for = 'Invalid date format';
    } else if (scheduledDate.getTime() < Date.now() - 60000) {
      errors.scheduled_for = 'Cannot schedule jobs in the past';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate rating input
 */
export function validateRating(data: {
  rating?: number;
  review_text?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (data.rating === undefined) {
    errors.rating = 'Rating is required';
  } else if (data.rating < 1 || data.rating > 5) {
    errors.rating = 'Rating must be between 1 and 5';
  } else if (!Number.isInteger(data.rating)) {
    errors.rating = 'Rating must be a whole number';
  }

  if (data.review_text && data.review_text.length > 2000) {
    errors.review_text = 'Review must be less than 2000 characters';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate teen profile update
 */
export function validateTeenProfile(data: {
  bio?: string;
  services?: string[];
  equipment?: string[];
  travel_radius_miles?: number;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const validServices: ServiceType[] = ['driveway', 'walkway', 'car_brushing', 'salting', 'combo'];
  const validEquipment: EquipmentType[] = ['shovel', 'snow_blower', 'salt_spreader', 'ice_scraper', 'broom'];

  if (data.bio && data.bio.length > 500) {
    errors.bio = 'Bio must be less than 500 characters';
  }

  if (data.services) {
    const invalidServices = data.services.filter(s => !validServices.includes(s as ServiceType));
    if (invalidServices.length > 0) {
      errors.services = `Invalid services: ${invalidServices.join(', ')}`;
    }
  }

  if (data.equipment) {
    const invalidEquipment = data.equipment.filter(e => !validEquipment.includes(e as EquipmentType));
    if (invalidEquipment.length > 0) {
      errors.equipment = `Invalid equipment: ${invalidEquipment.join(', ')}`;
    }
  }

  if (data.travel_radius_miles !== undefined) {
    if (data.travel_radius_miles < 0.5) {
      errors.travel_radius_miles = 'Minimum travel radius is 0.5 miles';
    } else if (data.travel_radius_miles > 10) {
      errors.travel_radius_miles = 'Maximum travel radius is 10 miles';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate homeowner profile update
 */
export function validateHomeownerProfile(data: {
  property_type?: string;
  driveway_size?: string;
  special_instructions?: string;
  preferred_payment_method?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  const validPropertyTypes: PropertyType[] = ['house', 'condo', 'apartment', 'townhouse'];
  const validDrivewaySizes: DrivewaySize[] = ['small', 'medium', 'large', 'extra_large'];
  const validPaymentMethods: PaymentMethod[] = ['cash', 'stripe'];

  if (data.property_type && !validPropertyTypes.includes(data.property_type as PropertyType)) {
    errors.property_type = 'Invalid property type';
  }

  if (data.driveway_size && !validDrivewaySizes.includes(data.driveway_size as DrivewaySize)) {
    errors.driveway_size = 'Invalid driveway size';
  }

  if (data.special_instructions && data.special_instructions.length > 1000) {
    errors.special_instructions = 'Special instructions must be less than 1000 characters';
  }

  if (data.preferred_payment_method && !validPaymentMethods.includes(data.preferred_payment_method as PaymentMethod)) {
    errors.preferred_payment_method = 'Invalid payment method';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate savings goal
 */
export function validateSavingsGoal(data: {
  name?: string;
  target_amount?: number;
  target_date?: string;
}): ValidationResult {
  const errors: Record<string, string> = {};

  if (!data.name) {
    errors.name = 'Goal name is required';
  } else if (data.name.length > 100) {
    errors.name = 'Goal name must be less than 100 characters';
  }

  if (data.target_amount === undefined) {
    errors.target_amount = 'Target amount is required';
  } else if (data.target_amount <= 0) {
    errors.target_amount = 'Target amount must be greater than 0';
  } else if (data.target_amount > 100000) {
    errors.target_amount = 'Target amount must be less than $100,000';
  }

  if (data.target_date) {
    const targetDate = new Date(data.target_date);
    if (isNaN(targetDate.getTime())) {
      errors.target_date = 'Invalid date format';
    } else if (targetDate.getTime() < Date.now()) {
      errors.target_date = 'Target date must be in the future';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10 || (cleaned.length === 11 && cleaned.startsWith('1'));
}
