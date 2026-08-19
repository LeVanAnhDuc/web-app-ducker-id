// libs
import { useState, useCallback, useRef, useEffect } from "react";

const useCopyToClipboard = (timeout = 2000) => {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = useCallback(
    async (text: string): Promise<void> => {
      setError(null);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), timeout);
      } catch (err) {
        const copyError =
          err instanceof Error ? err : new Error("Failed to copy to clipboard");
        setError(copyError);
      }
    },
    [timeout]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  return { copied, copy, error };
};

export default useCopyToClipboard;
