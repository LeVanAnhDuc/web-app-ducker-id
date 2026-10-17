"use client";

// libs
import { useState } from "react";
// components
import UnlockRequestStep from "../../components/UnlockRequestStep";
import UnlockVerifyStep from "../../components/UnlockVerifyStep";
// hooks
import { useUnlockRequest } from "../../hooks/useUnlockRequest";

const UnlockFlow = ({ email }: { email: string }) => {
  const [sent, setSent] = useState(false);
  const { mutate: request, isPending: isRequesting } = useUnlockRequest();

  const handleRequest = () =>
    request(email, { onSuccess: () => setSent(true) });

  if (sent)
    return (
      <UnlockVerifyStep
        email={email}
        isResending={isRequesting}
        onResend={handleRequest}
      />
    );

  return (
    <UnlockRequestStep isRequesting={isRequesting} onRequest={handleRequest} />
  );
};

export default UnlockFlow;
