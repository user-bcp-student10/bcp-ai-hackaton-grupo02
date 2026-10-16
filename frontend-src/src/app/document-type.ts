export const DOCUMENT_TYPES = ['DNI', 'CE'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];