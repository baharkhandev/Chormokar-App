const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:8001/api/v1';

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken: string;
  user: any;
  timestamp: number;
}

// In-memory cache for recent token refreshes (grace period: 15 seconds)
// Prevents concurrent requests with the same token from triggering Django's reuse detection
const recentRefreshCache = new Map<string, TokenRefreshResult>();
const inFlightRefreshes = new Map<string, Promise<TokenRefreshResult | null>>();

function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of recentRefreshCache.entries()) {
    if (now - value.timestamp > 30000) {
      recentRefreshCache.delete(key);
    }
  }
}

export async function refreshAdminSession(
  refreshToken: string
): Promise<TokenRefreshResult | null> {
  if (!refreshToken) return null;

  cleanupCache();

  // 1. Check if this refresh token was already exchanged in the last 15 seconds
  const cached = recentRefreshCache.get(refreshToken);
  if (cached && Date.now() - cached.timestamp < 15000) {
    return cached;
  }

  // 2. Check if a refresh request for this token is currently in flight
  let resultPromise = inFlightRefreshes.get(refreshToken);

  if (!resultPromise) {
    resultPromise = (async () => {
      try {
        const response = await fetch(`${API_URL}/auth/refresh/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          return null;
        }

        const resJson = await response.json();
        const payload = resJson.data || resJson;

        const newAccessToken = payload.access_token;
        const newRefreshToken = payload.refresh_token;
        const user = payload.user;

        if (!newAccessToken) {
          return null;
        }

        if (user && !user.is_staff && !user.is_superuser) {
          return null;
        }

        const resData: TokenRefreshResult = {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          user,
          timestamp: Date.now(),
        };

        recentRefreshCache.set(refreshToken, resData);
        if (newRefreshToken) {
          recentRefreshCache.set(newRefreshToken, resData);
        }

        return resData;
      } catch (err) {
        console.error('refreshAdminSession error:', err);
        return null;
      } finally {
        inFlightRefreshes.delete(refreshToken);
      }
    })();

    inFlightRefreshes.set(refreshToken, resultPromise);
  }

  return resultPromise;
}
