/**
 * Data masking utilities for privacy protection
 * Functions to mask sensitive customer information
 */

/**
 * Mask phone number (08x-xxx-1234)
 */
export function maskPhone(phone: string): string {
  if (!phone || phone.length < 10) return phone;
  return phone.replace(/(\d{2})\d{4}(\d{4})/, "$1x-xxx-$2");
}

/**
 * Mask ID card number (1-xxxx-xxxxx-xx-2)
 */
export function maskIdCard(idCard: string): string {
  if (!idCard || idCard.length < 13) return idCard;
  return idCard.replace(/(\d{1})\d{11}(\d{1})/, "$1-xxxx-xxxxx-xx-$2");
}

/**
 * Mask customer name (สxxxxx นxxxxx)
 */
export function maskName(name: string): string {
  if (!name) return name;
  const parts = name.split(" ");
  return parts
    .map((part) =>
      part.length > 0 ? part[0] + "x".repeat(part.length - 1) : part,
    )
    .join(" ");
}

/**
 * Mask email address (u***@example.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const maskedLocal = local.length > 1 ? local[0] + "***" : local;
  return `${maskedLocal}@${domain}`;
}
