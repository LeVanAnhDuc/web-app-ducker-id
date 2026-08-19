// libs
import { useEffect, useState } from "react";

const useDelayedFlag = (flag: boolean, delayMs = 300) => {
  const [delayed, setDelayed] = useState(flag);

  useEffect(() => {
    if (flag) {
      setDelayed(true);
      return;
    }
    const timer = setTimeout(() => setDelayed(false), delayMs);
    return () => clearTimeout(timer);
  }, [flag, delayMs]);

  return delayed;
};

export default useDelayedFlag;
