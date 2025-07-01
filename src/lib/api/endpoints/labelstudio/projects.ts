import { ApiError } from 'next/dist/server/api-utils';
import { APIClient } from '../../client';

import { ProjectPageResponse } from '../../types';

export const getProjects = async (): Promise<ProjectPageResponse> => {
  try {
    const response =
      await APIClient.labelstudio.get<ProjectPageResponse>('/projects');
    return response;
  } catch (error) {
    console.error('Failed to getProjects:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to get label studio projects');
  }
};
