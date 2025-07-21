import { Project } from '@/entities/labelstudio';
import { ModelType } from '@/entities/ml-model';
import { MLModelType } from './ml-models';
import { PaginatedLabelStudioResponse } from './pagination';

export interface ProjectResponse {
  id: number;
  title: string;
  color: string;
  ml_model_type: MLModelType;
  finished_task_number: number;
  task_number: number;
  total_annotations_number: number;
  total_predictions_number: number;
}

export type GetProjectsResponse = PaginatedLabelStudioResponse<ProjectResponse>;

export namespace ProjectResponse {
  export function toEntity(response: ProjectResponse): Project {
    return {
      id: response.id.toString(),
      title: response.title,
      color: response.color,
      type: ModelType.fromString(response.ml_model_type),
      finishedTasksCount: response.finished_task_number,
      totalTasksCount: response.task_number,
      annotationsCount: response.total_annotations_number,
      predictionsCount: response.total_predictions_number,
    };
  }
}
