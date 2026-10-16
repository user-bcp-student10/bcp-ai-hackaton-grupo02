import { validationError } from "./errors.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.length > 0;
}

function isValidEmail(value) {
  if (!isNonEmptyString(value) || value.length > 254) {
    return false;
  }

  const separator = value.lastIndexOf("@");
  if (separator <= 0 || separator !== value.indexOf("@")) {
    return false;
  }

  const localPart = value.slice(0, separator);
  const domain = value.slice(separator + 1);
  if (
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(localPart)
  ) {
    return false;
  }

  const labels = domain.split(".");
  return (
    labels.length >= 2 &&
    labels.every(
      (label) =>
        label.length > 0 &&
        label.length <= 63 &&
        /^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/u.test(label),
    )
  );
}

function isValidDocument(documentType, document) {
  if (!isNonEmptyString(document)) {
    return false;
  }

  if (documentType === "TEST") {
    return document.startsWith("TEST-");
  }

  if (documentType === "DNI") {
    return /^\d{8}$/u.test(document);
  }

  if (documentType === "CE") {
    return /^\d{9}$/u.test(document);
  }

  return false;
}

export function validateSignup(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !["TEST", "DNI", "CE"].includes(body.documentType) ||
    !isValidDocument(body.documentType, body.document) ||
    !isNonEmptyString(body.password) ||
    !isValidEmail(body.email)
  ) {
    throw validationError();
  }

  return {
    documentType: body.documentType,
    document: body.document,
    password: body.password,
    email: body.email.trim().toLowerCase(),
  };
}

export function validateLogin(body) {
  if (
    body === null ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    !["TEST", "DNI", "CE"].includes(body.documentType) ||
    !isValidDocument(body.documentType, body.document) ||
    !isNonEmptyString(body.password)
  ) {
    throw validationError();
  }

  return {
    documentType: body.documentType,
    document: body.document,
    password: body.password,
  };
}
