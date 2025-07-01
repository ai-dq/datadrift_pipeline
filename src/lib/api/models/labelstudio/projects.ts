import { Project } from '@/entities/labelstudio';
import { MLModelType } from '../../models/ml-models';
import { PaginatedLabelStudioResponse } from '../pagination';

export interface ProjectResponse {
  id: number;
  title: string;
  type: MLModelType;
}

export type GetProjectsResponse = PaginatedLabelStudioResponse<ProjectResponse>;

export namespace ProjectResponse {
  export function toEntity(response: ProjectResponse): Project {
    return {
      id: response.id.toString(),
      title: response.title,
      type: response.type,
    };
  }
}
