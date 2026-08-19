"use client";

// libs
import { useRef, useCallback } from "react";

const useSubmitGuard = () => {
  const inFlightRef = useRef(false);

  const run = useCallback((submit: () => void) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    submit();
  }, []);

  const release = useCallback(() => {
    inFlightRef.current = false;
  }, []);

  return { run, release };
};

export default useSubmitGuard;
