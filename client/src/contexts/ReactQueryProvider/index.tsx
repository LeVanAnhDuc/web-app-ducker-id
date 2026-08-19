"use client";
// libs
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import queryClient from "@/libs/query-client";
// types
import type { ReactNode } from "react";

const ReactQueryProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(queryClient);

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};

export default ReactQueryProvider;
