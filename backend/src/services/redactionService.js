/**
 * PII Redaction Service
 * Masks emails, phone numbers, and ID-like numbers with same-length 'X' characters
 * so that original character offsets never shift.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Matches standard phone numbers (+1-800-555-0199, 9876543210, (555) 000-1234, etc.)
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

// Matches ID numbers (e.g. SSN \d{3}-\d{2}-\d{4}, Aadhaar \d{4}-\d{4}-\d{4}, 6-12 digit IDs, PAN [A-Z]{5}\d{4}[A-Z])
const ID_NUMBER_REGEX = /\b(\d{3}-\d{2}-\d{4}|\d{4}[-\s]\d{4}[-\s]\d{4}|[A-Z]{5}\d{4}[A-Z]|\d{8,16})\b/g;

export function redactText(text) {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // 1. Mask Emails with exact-length 'X'
  redacted = redacted.replace(EMAIL_REGEX, (match) => 'X'.repeat(match.length));

  // 2. Mask Phone Numbers with exact-length 'X'
  redacted = redacted.replace(PHONE_REGEX, (match) => 'X'.repeat(match.length));

  // 3. Mask ID-like numbers with exact-length 'X'
  redacted = redacted.replace(ID_NUMBER_REGEX, (match) => 'X'.repeat(match.length));

  return redacted;
}
