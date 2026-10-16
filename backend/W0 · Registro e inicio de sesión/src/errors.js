export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const validationError = () =>
  new ApiError(400, "VALIDATION_ERROR", "La solicitud contiene datos inválidos.");

export const accountAlreadyExistsError = () =>
  new ApiError(409, "ACCOUNT_ALREADY_EXISTS", "El documento o correo ya está registrado.");

export const invalidCredentialsError = () =>
  new ApiError(401, "INVALID_CREDENTIALS", "Documento o contraseña incorrectos.");

export const rateLimitedError = () =>
  new ApiError(429, "RATE_LIMITED", "Se superó el límite de intentos.");

export const authUnavailableError = () =>
  new ApiError(503, "AUTH_UNAVAILABLE", "El servicio de autenticación no está disponible.");
