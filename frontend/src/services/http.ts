import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

interface RetryConfig extends InternalAxiosRequestConfig {
  _retriedAfterRefresh?: boolean;
}

const gatewayBase = import.meta.env.VITE_GATEWAY_BASE_URL || "http://localhost:2399/api";

// Cliente para rotas de autenticação (MAIN_SERVICE via gateway)
export const http = axios.create({
  baseURL: gatewayBase,
  withCredentials: true,
  timeout: 10_000,
});

// Cliente para rotas do inventory (AMOSTRAS_TINTAS via gateway)
export const inventoryHttp = axios.create({
  baseURL: `${gatewayBase}/amostras-tintas`,
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
  (error: AxiosError) => Promise.reject(error),
);

inventoryHttp.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retriedAfterRefresh
    ) {
      return Promise.reject(error);
    }

    try {
      config._retriedAfterRefresh = true;
      await refreshSession();
      return await inventoryHttp.request(config);
    } catch (refreshError) {
      const publicBase = import.meta.env.VITE_PUBLIC_BASE || "/";
      const loginPath = `${publicBase}login`.replace("//", "/");
      if (typeof window !== "undefined" && window.location.pathname !== loginPath) {
        window.location.href = `${loginPath}?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
      }
      return Promise.reject(refreshError);
    }
  },
);

