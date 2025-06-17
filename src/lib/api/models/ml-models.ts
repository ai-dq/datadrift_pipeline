// Model interfaces and types for API responses

import { Model } from '@/entities/ml-model';
import { formatRelativeTime } from '@/utils/time.util';
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

export namespace MLModelResponse {
  export function toEntity(response: MLModelResponse): Model {
    return {
      id: response.id.toString(),
      name: response.name,
      type: response.type,
      version: response.version,
      updatedAt: formatRelativeTime(response.updated_at),
    };
  }
}
