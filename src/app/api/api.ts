import { NextRequest } from "next/server";

export class ApiError extends Error {
  status: number;

  constructor(status = 500, message = "Internal Server Error") {
    super(message)
    this.status = status
  }
}

const API = {
  isApiError: (error: unknown): error is ApiError => error instanceof ApiError,

  getBearerToken: (request: NextRequest) => {
    const authorization = request.headers.get("authorization")
    if (!authorization) {
      throw new ApiError(401, "Missing Authorization header")
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      throw new ApiError(401, "Invalid Authorization header")
    }

    return match[1]
  },

  getErrorInfo: (
    error: unknown,
    fallbackStatus = 500,
    fallbackMessage = "Internal Server Error"
  ) => {
    if (error instanceof ApiError) {
      return { status: error.status, message: error.message };
    }
    return { status: fallbackStatus, message: fallbackMessage };
  },

  throwAPIError: (status?: number, message?: string) => {
    throw new ApiError(status, message);
  }
}

export default API
