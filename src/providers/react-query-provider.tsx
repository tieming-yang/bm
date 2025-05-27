"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
//TODO: install react-query-devtools for debugging
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";

function ReactQueryProvider({ children }: React.PropsWithChildren) {
  const [client] = useState(
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 1000 * 30,
        },
      },
    })
  );

  return (
    <QueryClientProvider client={client}>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" /> */}
    </QueryClientProvider>
  );
}

export default ReactQueryProvider;
