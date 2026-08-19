"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const useCountdown = (initialSeconds: number) => {
  const [seconds, setSeconds] = useState(initialSeconds);
  const endTimeRef = useRef(Date.now() + initialSeconds * 1000);

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000);
      setSeconds(Math.max(0, remaining));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const reset = useCallback(() => {
    endTimeRef.current = Date.now() + initialSeconds * 1000;
    setSeconds(initialSeconds);
  }, [initialSeconds]);

  return { seconds, isFinished: seconds <= 0, reset };
};

export default useCountdown;
