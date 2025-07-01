import { APIClient } from '../client';
import { APIError } from '../types';

export const getAccessTokenByRefresh = async (refresh: string): Promise<string> => {
  try {
    const response = await APIClient.labelstudio.post<{ access: string }>(
      '/jwt_auth/refresh/',
      { refresh },
    );
    if (!response.access) throw new APIError(0, 'No access token in response');
    return response.access;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(0, 'Failed to refresh access token');
  }
};
