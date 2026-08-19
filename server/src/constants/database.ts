export const CONNECTION_STATES = {
  DISCONNECTED: 0 /** Connection is not established */,
  CONNECTED: 1 /** Connection is active and ready to use */,
  CONNECTING: 2 /** Connection is being established */,
  DISCONNECTING: 3 /** Connection is being closed */
} as const;
