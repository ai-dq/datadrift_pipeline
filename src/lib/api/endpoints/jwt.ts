import { APIClient } from '../client';
import { APIError } from '../types';

export const getAccessTokenByRefresh = async (refresh: string): Promise<string> => {
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
export const getTokensByCredentials = async (email: string, password: string): Promise<{ access: string; refresh: string }> => {
  try {
    const basicAuth = btoa(`${email}:${password}`);
    const response = await fetch('/api/labelstudio/token/obtain/', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) throw new APIError(response.status, 'Failed to obtain tokens');
    const data = await response.json();
    if (!data.access || !data.refresh) throw new APIError(0, 'No tokens in response');
    return { access: data.access, refresh: data.refresh };
  } catch (error) {
    console.error('Failed to obtain tokens:', error);
    if (error instanceof APIError) throw error;
    throw new APIError(0, 'Failed to obtain tokens');
  }
};
