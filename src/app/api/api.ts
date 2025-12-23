export class ApiError extends Error {
  status: number;

  constructor(status: number, message = "Internal Server Error") {
    super(message)
    this.status = status
  }
}
