// Model types
export { MLModelResponse } from './models/ml-models';
export type { GetMLModelsResponse as MLModelPageResponse } from './models/ml-models';

// Model Version types
export { MLModelVersionResponse } from './models/ml-model-version';
export type { GetMLModelVersionsResponse as MLModelVersionPageResponse } from './models/ml-model-version';

// LabelStudio projects
export { ProjectResponse } from './models/projects';
export type { GetProjectsResponse as ProjectPageResponse } from './models/projects';

// Pagination models
export type {
  PaginatedResponse,
  PaginationParams,
  PaginatedQueryParams,
} from './models/pagination';

// Custom APIError class
export class APIError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

// Tokens are stored in localStorage under 'access_token' and 'refresh_token' keys for JWT authentication.
