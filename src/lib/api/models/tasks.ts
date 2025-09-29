export interface TaskResponse {
  epochs: number;
  error?: string;
  metrics?: TrainingMetricsResponse;
  status: string;
  timestamp: number;
}
