export type Model = {
  id: string;
  name: string;
  type: 'layout' | 'ocrcls' | 'ocrrec' | 'ocrdet' | 'tabrec';
  version: string;
  updatedAt: string;
  description: string | null;
};

export interface TrainingMetrics {
  epochs: number | null;
  trainingTime: number | null;
  precision: number | null;
  recall: number | null;
  map50: number | null;
  map50to95: number | null;
}

export type ModelVersion = {
  version: string;
  trainedAt: string;
  trainingMetrics: TrainingMetrics;
};
