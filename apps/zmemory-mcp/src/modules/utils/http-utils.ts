import { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { ZMemoryError, OAuthError } from '../../types.js';

export function setupResponseInterceptor(client: AxiosInstance): void {
  client.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
      const message = error.response?.data?.error || error.message || 'Unknown error';
      const status = error.response?.status;
      const code = error.response?.data?.code;
      
      if (status === 401 && error.response?.data?.error) {
        throw new OAuthError(message, error.response.data.error, error.response.data.error_description);
      }
      
      throw new ZMemoryError(message, code, status);
    }
  );
}

export function setupRequestInterceptor(
  client: AxiosInstance,
  getAuthToken: () => string | undefined,
  getApiKey: () => string | undefined
): void {
  client.interceptors.request.use(
    (config) => {
      const authToken = getAuthToken();
      const apiKey = getApiKey();
      
      if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
      } else if (apiKey) {
        config.headers.Authorization = `Bearer ${apiKey}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );
}