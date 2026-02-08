/**
 * Maps API business error codes to translation keys.
 * Falls back to a default key when the code is unknown.
 */
const ERROR_CODE_MAP: Record<string, string> = {
  // Auth
  AUTH_INVALID_CREDENTIALS: 'apiError.invalidCredentials',
  AUTH_TOKEN_EXPIRED: 'apiError.tokenExpired',
  AUTH_EMAIL_EXISTS: 'apiError.emailExists',

  // Tickets
  TICKET_NOT_FOUND: 'apiError.ticketNotFound',
  TICKET_INVALID_TRANSITION: 'apiError.ticketInvalidTransition',
  TICKET_PAYMENT_PENDING: 'apiError.ticketPaymentPending',
  TICKET_INVALID_AMOUNT: 'apiError.ticketInvalidAmount',
  TICKET_ALREADY_PAID: 'apiError.ticketAlreadyPaid',

  // Files
  FILE_NOT_FOUND: 'apiError.fileNotFound',
  FILE_INVALID_TYPE: 'apiError.fileInvalidType',
  FILE_INVALID_REFERENCE: 'apiError.fileInvalidReference',

  // Payments
  PAYMENT_NOT_FOUND: 'apiError.paymentNotFound',
  PAYMENT_ALREADY_PAID: 'apiError.paymentAlreadyPaid',
  PAYMENT_CHECKOUT_FAILED: 'apiError.paymentCheckoutFailed',
};

interface ApiErrorBody {
  code?: string;
  message?: string;
}

/**
 * Extracts a user-friendly error message from a caught error.
 *
 * @param error  - The caught value (usually an Error thrown by apiRequest)
 * @param t      - Translation function
 * @param fallbackKey - Default translation key when no specific mapping exists
 */
export function getErrorMessage(
  error: unknown,
  t: (key: string) => string,
  fallbackKey: string,
): string {
  if (!(error instanceof Error)) return t(fallbackKey);

  // apiRequest stores the API body in error.cause when available
  const cause = (error as Error & { cause?: ApiErrorBody }).cause;
  if (cause?.code) {
    const translationKey = ERROR_CODE_MAP[cause.code];
    if (translationKey) return t(translationKey);
  }

  // If no mapped code, use the raw API message (better than generic)
  if (error.message && error.message !== 'Request failed') {
    return error.message;
  }

  return t(fallbackKey);
}
