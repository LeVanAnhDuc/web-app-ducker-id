export const getSecondsUntilMidnightUTC = (): number => {
  const now = new Date();
  const midnight = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0,
      0,
      0
    )
  );

  return Math.ceil((midnight.getTime() - now.getTime()) / 1000);
};
