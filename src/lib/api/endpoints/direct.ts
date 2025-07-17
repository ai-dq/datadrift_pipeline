import { getCookie } from '@/lib/utils/cookie.util';
import { APIClient, ApiError } from '../../client';

export const getAuthPrerequisits = async (): Promise<[string, string]> => {
  try {
    const _ = await APIClient.direct.get<void>('/user/login');

    const middlewareCsrfToken = getCookie('csrftoken');
    if (!middlewareCsrfToken) {
      throw new ApiError(0, 'CSRF token is not stored in browser cookie');
    }

    const sessionID = getCookie('sessionid');
    if (!sessionID) {
      throw new ApiError(0, 'Session ID is not stored in browser cookie');
    }

    return [middlewareCsrfToken, sessionID];
  } catch (error) {
    console.error(
      'Failed to get csrfToken or sessionID on middleware: ',
      error,
    );
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to get csrfToken or sessionID on middleware');
  }
};

export const directLogin = async (
  email: string,
  password: string,
  csrfMiddlewareToken: string,
  sessionID: string,
): Promise<string> => {
  try {
    const _ = await APIClient.direct.post<void>('/user/login', {
      csrfmiddlewaretoken: csrfMiddlewareToken,
      sessionid: sessionID,
      email: email,
      password: password,
      persist_session: 'on',
    });

    const csrfToken = getCookie('csrftoken');
    if (!csrfToken) {
      throw new ApiError(
        0,
        `Failed to login, no CSRF token found from browser cookie`,
      );
    }

    return csrfToken;
  } catch (error) {
    console.error('Failed to login:', error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, 'Failed to login');
  }
};
