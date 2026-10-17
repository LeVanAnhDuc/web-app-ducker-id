"use client";

// libs
import { useCallback, useRef } from "react";

/**
 * Returns focus to a remembered element when a Radix dialog or sheet closes.
 * Radix only restores focus to its own `*Trigger`; a dialog opened from a
 * button outside it, or from a dropdown item that has since unmounted, drops
 * focus on `<body>`. Call `remember(el)` when opening, pass `onCloseAutoFocus`
 * to the content.
 */
const useReturnFocus = () => {
  const targetRef = useRef<HTMLElement | null>(null);

  const remember = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;
  }, []);

  const onCloseAutoFocus = useCallback((event: Event) => {
    const target = targetRef.current;
    targetRef.current = null;
    if (!target?.isConnected) return;
    event.preventDefault();
    target.focus();
  }, []);

  return { remember, onCloseAutoFocus };
};

export default useReturnFocus;
