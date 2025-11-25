// Generic pagination model
// Common interface for paginated API responses

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
}

// Pagination parameters for Label Studio API responses
export interface PaginatedLabelStudioResponse<T> {
  count: number;
  next?: string;
  previous?: string;
  results: T[];
}

// Pagination parameters for requests
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Helper type for paginated query parameters
export interface PaginatedQueryParams extends PaginationParams {
  [key: string]: any;
}
