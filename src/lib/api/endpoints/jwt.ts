import { APIClient } from '../client';
import { APIError } from '../types';

export const getAccessTokenByRefresh = async (
  refresh: string,
): Promise<string> => {
  try {
    const response = await APIClient.labelstudio.post<{ access: string }>(
      '/token/refresh/',
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

// Obtain access/refresh tokens using email and password (Basic Auth)
export const getTokensByCredentials = async (
  email: string,
  password: string,
): Promise<{ access: string; refresh: string }> => {
  try {
    const basicAuth = btoa(`${email}:${password}`);
    const response = await APIClient.labelstudio.post<{
      access: string;
      refresh: string;
    }>(
      '/token/obtain/',
      { email, password },
      {
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    if (!response.access || !response.refresh)
      throw new APIError(0, 'No tokens in response');
    return { access: response.access, refresh: response.refresh };
  } catch (error) {
    console.error('Failed to obtain tokens:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(0, 'Failed to obtain tokens');
  }
};
