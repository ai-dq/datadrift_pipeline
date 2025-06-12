// Model interfaces and types for API responses

import { PaginatedResponse } from './pagination';

export interface MLModelResponse {
  id: number;
  name: string;
  type: 'layout' | 'ocrcls' | 'ocrrec' | 'ocrdet' | 'tabrec';
  version: string;
  created_at: string;
  updated_at: string;
  description: string | null;
}

export type GetMLModelsResponse = PaginatedResponse<MLModelResponse>;
