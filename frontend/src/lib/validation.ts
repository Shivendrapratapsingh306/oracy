export type FieldError = string | undefined;

export function validateName(value: string): FieldError {
  if (!value.trim()) return "Enter your name.";
  if (value.trim().length < 2) return "Name must be at least 2 characters.";
  return undefined;
}

export function validateEmail(value: string): FieldError {
  const v = value.trim();
  if (!v) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return "Enter a valid email address.";
  return undefined;
}

export function validatePassword(value: string): FieldError {
  if (!value) return "Enter a password.";
  if (value.length < 8) return "Use at least 8 characters.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Include at least one letter and one number.";
  return undefined;
}

export function validateConfirm(password: string, confirm: string): FieldError {
  if (!confirm) return "Confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return undefined;
}

export function validateResumeFile(file: File | null, maxMb: number): FieldError {
  if (!file) return "Choose a resume file.";
  const okType = /\.(pdf|docx)$/i.test(file.name);
  if (!okType) return "Upload a PDF or DOCX file.";
  if (file.size > maxMb * 1024 * 1024) return `File must be under ${maxMb} MB.`;
  return undefined;
}

export function validateRequiredText(value: string, label: string, min = 2, max = 80): FieldError {
  const v = value.trim();
  if (!v) return `Enter ${label}.`;
  if (v.length < min) return `${label.charAt(0).toUpperCase()}${label.slice(1)} must be at least ${min} characters.`;
  if (v.length > max) return `Keep ${label} under ${max} characters.`;
  return undefined;
}

export function validateOptionalText(value: string, label: string, max: number): FieldError {
  if (value.trim().length > max) return `Keep ${label} under ${max} characters.`;
  return undefined;
}

export function validateGradYear(value: string): FieldError {
  const v = value.trim();
  if (!v) return undefined;
  if (!/^\d{4}$/.test(v)) return "Enter a four-digit year, e.g. 2027.";
  const year = Number(v);
  const now = new Date().getFullYear();
  if (year < now - 10 || year > now + 8) return `Enter a year between ${now - 10} and ${now + 8}.`;
  return undefined;
}

export function validateIntRange(value: string, label: string, min: number, max: number): FieldError {
  const v = value.trim();
  if (!v) return `Enter ${label}.`;
  if (!/^\d+$/.test(v)) return `${label.charAt(0).toUpperCase()}${label.slice(1)} must be a whole number.`;
  const n = Number(v);
  if (n < min || n > max) return `${label.charAt(0).toUpperCase()}${label.slice(1)} must be between ${min} and ${max}.`;
  return undefined;
}

/** `iso` is YYYY-MM-DD; `todayIso` is today's local date in the same format. */
export function validateFutureDate(iso: string, todayIso: string): FieldError {
  if (!iso) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "Enter a valid date.";
  if (iso < todayIso) return "Choose today or a future date.";
  return undefined;
}

export function validatePhotoFile(file: File, maxKb: number): FieldError {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return "Upload a PNG, JPG or WebP image.";
  if (file.size > maxKb * 1024) return `Image must be under ${maxKb} KB.`;
  return undefined;
}
