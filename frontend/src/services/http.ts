import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

export const http = axios.create({
  baseURL: import.meta.env.VITE_GATEWAY_BASE_URL || "http://localhost:2399/api",
  withCredentials: true,
  timeout: 10_000,
});

let refreshRequest: Promise<void> | null = null;

const refreshSession = () => {
  if (!refreshRequest) {
    refreshRequest = http
      .post("/auth/token/refresh", undefined, {
        _retriedAfterRefresh: true,
      } as AxiosRequestConfig)
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;
    const isAuthRequest = config?.url?.startsWith("/auth/");

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retriedAfterRefresh ||
      isAuthRequest
    ) {
      return Promise.reject(error);
    }

    try {
      config._retriedAfterRefresh = true;
      await refreshSession();
      return await http.request(config);
    } catch (refreshError) {
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      return Promise.reject(refreshError);
    }
  },
);
