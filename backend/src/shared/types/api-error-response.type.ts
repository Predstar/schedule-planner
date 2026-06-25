export interface ErrorDetail {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  timestamp: string;
  statusCode: number;
  code: string;
  message: string;
  details: ErrorDetail[];
}
