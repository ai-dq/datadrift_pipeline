import { Project } from '@/entities/labelstudio';
import { ModelType } from '@/entities/ml-model';
import { MLModelType } from './ml-models';
import { PaginatedLabelStudioResponse } from './pagination';

export interface ProjectResponse {
  id: number;
  title: string;
  ml_model_type: MLModelType;
}

export type GetProjectsResponse = PaginatedLabelStudioResponse<ProjectResponse>;

export namespace ProjectResponse {
  export function toEntity(response: ProjectResponse): Project {
    return {
      id: response.id.toString(),
      title: response.title,
      type: ModelType.fromString(response.ml_model_type),
    };
  }
}
