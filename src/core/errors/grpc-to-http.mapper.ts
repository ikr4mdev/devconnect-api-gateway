import { AppErrorCode } from '@devconnect-microservices/devconnect-contracts';

interface HttpErrorMapping {
  status: number;
  message: string;
}

export const HttpStatusMap = {
  // ---- Auth / Registration ----
  [AppErrorCode.EMAIL_ALREADY_REGISTERED]: {
    status: 409,
    message:
      'An account with this email already exists. Try signing in instead.',
  },
  [AppErrorCode.EMAIL_ALREADY_VERIFIED]: {
    status: 409,
    message: 'This email is already verified. You can sign in now.',
  },
  [AppErrorCode.INVALID_CREDENTIALS]: {
    status: 401,
    message: 'Invalid email or password.',
  },
  [AppErrorCode.USER_NOT_FOUND]: {
    status: 404,
    message: 'User not found.',
  },

  // ---- Email Verification ----
  [AppErrorCode.VERIFICATION_TOKEN_NOT_FOUND]: {
    status: 404,
    message: 'This verification link is invalid or no longer available.',
  },
  [AppErrorCode.VERIFICATION_TOKEN_EXPIRED]: {
    status: 410,
    message: 'This verification link has expired. Please request a new one.',
  },
  [AppErrorCode.VERIFICATION_TOKEN_ALREADY_USED]: {
    status: 409,
    message: 'This verification link has already been used.',
  },

  // ---- Email Delivery ----
  [AppErrorCode.EMAIL_SEND_FAILED]: {
    status: 503,
    message:
      "We couldn't send the verification email right now. Please try again later.",
  },

  // ---- Generic ----
  [AppErrorCode.INTERNAL_ERROR]: {
    status: 500,
    message: 'Something went wrong on our end. Please try again later.',
  },
} as const satisfies Partial<Record<AppErrorCode, HttpErrorMapping>>;

export function mapHttp(code: AppErrorCode): HttpErrorMapping {
  return (
    HttpStatusMap[code] ?? {
      status: 500,
      message: 'Internal Server Error',
    }
  );
}
