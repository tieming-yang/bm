"use client";
import "../lib/i18n";

function ClientRoot({ children }: React.PropsWithChildren) {
  return (
    <div>
      {children}
      {/* <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" /> */}
    </div>
  );
}

export default ClientRoot;
