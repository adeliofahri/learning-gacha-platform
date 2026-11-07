export type ErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_FUNDS"
  | "RATE_LIMITED"
  | "UNPROCESSABLE";

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INSUFFICIENT_FUNDS: 409,
  RATE_LIMITED: 429,
  UNPROCESSABLE: 422,
};

export class AppError extends Error {
  readonly status: number;
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.status = STATUS[code];
  }
}

export const notFound = (what = "Data") => new AppError("NOT_FOUND", `${what} tidak ditemukan`);
export const forbidden = (msg = "Akses ditolak") => new AppError("FORBIDDEN", msg);
export const unauthorized = (msg = "Silakan login terlebih dahulu") =>
  new AppError("UNAUTHORIZED", msg);
