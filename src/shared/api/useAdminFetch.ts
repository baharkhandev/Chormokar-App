import { useCallback, useRef } from 'react';
import { useAdminAuth, getClientAccessToken } from '../auth/AuthContext';

export function useAdminFetch() {
  const { accessToken, refreshAuth } = useAdminAuth();
  const tokenRef = useRef(accessToken);
  tokenRef.current = accessToken;

  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers || {});
      const currentToken = tokenRef.current || getClientAccessToken();
      if (currentToken) {
        headers.set('Authorization', `Bearer ${currentToken}`);
      }
      const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
      if (!headers.has('Content-Type') && options.method && options.method !== 'GET' && !isFormData) {
        headers.set('Content-Type', 'application/json');
      }

      let res = await fetch(url, { ...options, headers });

      // If 401 unauthorized, attempt token refresh and retry once with the newly issued token
      if (res.status === 401) {
        const freshToken = await refreshAuth();
        if (freshToken) {
          tokenRef.current = freshToken;
          const freshHeaders = new Headers(options.headers || {});
          freshHeaders.set('Authorization', `Bearer ${freshToken}`);
          if (!freshHeaders.has('Content-Type') && options.method && options.method !== 'GET' && !isFormData) {
            freshHeaders.set('Content-Type', 'application/json');
          }
          res = await fetch(url, { ...options, headers: freshHeaders });
        }
      }

      return res;
    },
    [refreshAuth]
  );

  return authFetch;
}
