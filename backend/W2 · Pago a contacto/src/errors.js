export function apiError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

export const invalidRequestError = () =>
  apiError(400, "INVALID_REQUEST", "La solicitud no es válida.");

export const notFoundError = (resource = "El recurso solicitado") =>
  apiError(404, "NOT_FOUND", `${resource} no existe.`);

export const conflictError = (code, message) => apiError(409, code, message);
