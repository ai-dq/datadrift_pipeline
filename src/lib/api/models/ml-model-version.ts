// Model Version interfaces and types for API responses

import { ModelVersion, TrainingMetrics } from '@/entities/ml-model';
import { formatRelativeTime } from '@/utils/time.util';
import { PaginatedResponse } from './pagination';

export interface MLModelVersionResponse {
  model_id: number;
  trained_at: string;
  weight: string;
  version: string;
  training_args?: Record<string, any>;
  metrics?: Record<string, number>;
  notes?: string;
}

export type GetMLModelVersionsResponse =
  PaginatedResponse<MLModelVersionResponse>;

export namespace MLModelVersionResponse {
  export function toEntity(response: MLModelVersionResponse): ModelVersion {
    const metrics = response.metrics || {};
    const trainingMetrics: TrainingMetrics = {
      epochs: metrics.epochs || null,
      trainingTime: metrics.trainingTime || null,
      precision: metrics.precision || null,
      recall: metrics.recall || null,
      map50: metrics.map50 || null,
      map50to95: metrics.map50_95 || null,
    };
    return {
      version: response.version,
      trainedAt: formatRelativeTime(response.trained_at),
      trainingMetrics: trainingMetrics,
    };
  }
}
