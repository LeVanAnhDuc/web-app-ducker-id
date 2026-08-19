// libs
import { useQuery } from "@tanstack/react-query";
// types
import type { AxiosError, AxiosRequestConfig } from "axios";
import type { UseQueryOptions } from "@tanstack/react-query";
// others
import axiosInstance from "@/libs/axios";

const useApiQuery = <TData = unknown, TError = AxiosError>(
  key: string | string[],
  url: string,
  config?: AxiosRequestConfig<unknown>,
  options?: Omit<UseQueryOptions<TData, TError>, "queryKey" | "queryFn">
) =>
  useQuery<TData, TError>({
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: async () => {
      const response = await axiosInstance.get<ResponsePattern<TData>>(
        url,
        config
      );
      return response.data.data;
    },
    ...options
  });

export default useApiQuery;
