// Model Version interfaces and types for API responses

import {
  ModelVersion,
  TrainingArgs,
  TrainingMetrics,
} from '@/entities/ml-model';
import { formatRelativeTime } from '@/utils/time.util';
import { PaginatedResponse } from './pagination';
import { formatRelativeTime } from '@/utils/time.util';

export interface MLModelVersionResponse {
  id: number;
  ml_model: number;
  trained_at: string;
  weight: string;
  version: string;
  training_args?: Record<string, any>;
  metrics?: Record<string, any>;
  notes?: string;
}

export type GetMLModelVersionsResponse =
  PaginatedResponse<MLModelVersionResponse>;

export namespace MLModelVersionResponse {
  export function toEntity(response: MLModelVersionResponse): ModelVersion {
    const metrics = response.metrics || {};
    const trainingMetrics: TrainingMetrics = {
      epochs: Number(metrics.get('epoch')) || null,
      trainingTime: Number(metrics.get('time')) || null,
      precision: Number(metrics.get('metrics/precision(B)')) || null,
      recall: Number(metrics.get('metrics/recall(B)')) || null,
      map50: Number(metrics.get('metrics/mAP50(B)')) || null,
      map50to95: Number(metrics.get('metrics/mAP50-95(B)')) || null,
    };

    const args = response.training_args || {};
    const trainingArgs: TrainingArgs = {
      imageSize: Number(args.get('imgsz')) || null,
      optimizer: args.get('optimizer') || null,
      nbs: Number(args.get('nbs')) || null,
      iou: Number(args.get('iou')) || null,
      cls: Number(args.get('cls')) || null,
      dfl: Number(args.get('dfl')) || null,
      lr0: Number(args.get('lr0')) || null,
      lrf: Number(args.get('lrf')) || null,
      box: Number(args.get('box')) || null,
    };

    return {
      id: response.id,
      version: response.version,
      trainedAt: formatRelativeTime(response.trained_at),
      trainingMetrics: trainingMetrics,
      trainingArgs: trainingArgs,
      modelId: response.ml_model,
    };
  }
}
