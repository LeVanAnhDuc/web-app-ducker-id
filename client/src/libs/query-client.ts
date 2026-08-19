// libs
import { QueryClient, QueryCache, MutationCache } from "@tanstack/react-query";
import { isAxiosError, isCancel } from "axios";
// others
import { confirmErrorToast, errorToast } from "@/utils";
import CONSTANTS from "@/constants";

const SILENT_ERROR_CODES: string[] = [
  CONSTANTS.ERROR_CODES.REFRESH_TOKEN_REQUIRED
];

const getErrorMessage = (error: Error): string => {
  if (isAxiosError<ErrorResponsePattern>(error)) {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    const errorMapping: Record<number, string> = {
      400: message || "Bad request. Please check your input.",
      403: "You do not have permission to perform this action.",
      404: message || "The requested resource was not found.",
      409: message || "This data already exists.",
      422: message || "Invalid data. Please check your input.",
      429: "Too many requests. Please try again later."
    };

    return message || errorMapping[status as number] || "An error occurred";
  }

  if (error instanceof Error) return error.message;

  return "An unknown error occurred.";
};

const queryErrorHandler = (error: Error): void => {
  if (isCancel(error)) return;

  if (isAxiosError<ErrorResponsePattern>(error)) {
    const status = error.response?.status;
    const code = error.response?.data?.code;

    // Already handled by axios interceptor
    if (!error.response || error.code === "ECONNABORTED") {
      return;
    }

    // Silent codes — skip toast (handled silently elsewhere, e.g. session bootstrap)
    if (code && SILENT_ERROR_CODES.includes(code)) {
      return;
    }

    // 5xx — toast once after React Query retries exhausted
    if (status && status >= 500) {
      void confirmErrorToast("Server error. Please try again later.");
      return;
    }
  }

  const message = getErrorMessage(error);

  errorToast(message);
};

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: queryErrorHandler
  }),
  mutationCache: new MutationCache({
    onError: queryErrorHandler
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isAxiosError(error)) {
          const status = error.response?.status;

          // DON'T retry client errors (4xx)
          if (status && status >= 400 && status < 500) {
            return false;
          }

          // DON'T retry if no response (network error handled by axios)
          if (!error.response) {
            return false;
          }
        }

        // Retry server errors (5xx) or unknown errors max 2 times
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000) // Exponential backoff: 1s, 2s, 4s
    },
    mutations: {
      retry: false
    }
  }
});

export default queryClient;
