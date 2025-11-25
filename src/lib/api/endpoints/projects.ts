import { APIClient } from '../client';
import { ProjectPageResponse, APIError } from '../types';

export const getProjects = async (): Promise<ProjectPageResponse> => {
  try {
    const response =
      await APIClient.labelstudio.get<ProjectPageResponse>('/projects');
    return response;
  } catch (error) {
    console.error('Failed to getProjects:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(0, 'Failed to get label studio projects');
  }
};
