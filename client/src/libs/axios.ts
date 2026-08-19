// libs
import axios from "axios";
// types
import type {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig
} from "axios";
// others
import { confirmErrorToast, getCurrentLocale } from "@/utils";
import CONSTANTS from "@/constants";
import { useAuthStore } from "@/stores";

const API_TIMEOUT = 30000;
const SESSION_EXPIRED_CODES: string[] = [
  CONSTANTS.ERROR_CODES.REFRESH_TOKEN_REQUIRED,
  CONSTANTS.ERROR_CODES.REFRESH_TOKEN_INVALID
];

const handleLogout = () => {
  const { tokens, clearTokens } = useAuthStore.getState();

  if (!tokens) return;

  clearTokens();

  const currentLocale = getCurrentLocale();
  window.location.href = `/${currentLocale}${CONSTANTS.ROUTES.LOGIN}`;
};

const axiosInstance: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_PREFIX,
  timeout: API_TIMEOUT,
  headers: {
    "Content-Type": "application/json"
  }
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().tokens?.accessToken;

    if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig;

    // Session expired
    if (error.response?.status === 401) {
      const errorCode = (error.response.data as ErrorResponsePattern)?.code;

      if (
        originalRequest?.headers?.Authorization &&
        SESSION_EXPIRED_CODES.includes(errorCode)
      ) {
        handleLogout();
      }

      return Promise.reject(error);
    }

    // Cancelled request — silent reject
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      return Promise.reject(error);
    }

    // Network Error (no response from server)
    if (!error.response) {
      await confirmErrorToast(
        "Unable to connect to server. Please check your internet connection."
      );
      return Promise.reject(error);
    }

    // Timeout Error
    if (error.code === "ECONNABORTED") {
      await confirmErrorToast("Request timeout. Please try again.");
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
