"use client";

// libs
import { useCallback } from "react";

const useAnnounce = () => {
  const announce = useCallback((message: string) => {
    const announcer = document.getElementById("announcer");
    if (!announcer) return;

    announcer.textContent = "";
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }, []);

  return { announce };
};

export default useAnnounce;
