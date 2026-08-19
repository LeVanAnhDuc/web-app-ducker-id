"use client";

// libs
import { useEffect, useState } from "react";

const useHasMounted = (): boolean => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};

export default useHasMounted;
