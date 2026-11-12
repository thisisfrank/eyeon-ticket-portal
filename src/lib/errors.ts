export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
