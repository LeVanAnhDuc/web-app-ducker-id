export const RATE_LIMIT_CONFIG = {
  LOGIN: {
    PASSWORD: {
      PER_IP: {
        KEY: "rate-limit:login:ip:",
        MAX_REQUESTS: 30,
        WINDOW_SECONDS: 900
      }
    },
    OTP: {
      PER_IP: {
        KEY: "rate-limit:login-otp:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      },
      PER_EMAIL: {
        KEY: "rate-limit:login-otp:email:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      }
    },
    MAGIC_LINK: {
      PER_IP: {
        KEY: "rate-limit:magic-link:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      },
      PER_EMAIL: {
        KEY: "rate-limit:magic-link:email:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      }
    }
  },

  SIGNUP: {
    SEND_OTP: {
      PER_IP: {
        KEY: "rate-limit:signup:ip:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      },
      PER_EMAIL: {
        KEY: "rate-limit:signup:email:",
        MAX_REQUESTS: 3,
        WINDOW_SECONDS: 900
      }
    },
    CHECK_EMAIL: {
      PER_IP: {
        KEY: "rate-limit:check-email:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 60
      }
    }
  },

  FORGOT_PASSWORD: {
    OTP: {
      PER_IP: {
        KEY: "rate-limit:forgot-pw-otp:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      },
      PER_EMAIL: {
        KEY: "rate-limit:forgot-pw-otp:email:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      }
    },
    MAGIC_LINK: {
      PER_IP: {
        KEY: "rate-limit:forgot-pw-ml:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      },
      PER_EMAIL: {
        KEY: "rate-limit:forgot-pw-ml:email:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      }
    },
    RESET: {
      PER_IP: {
        KEY: "rate-limit:forgot-pw-reset:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      }
    }
  },

  CHANGE_PASSWORD: {
    PER_IP_USER: {
      KEY: "rate-limit:change-password:ip-user:",
      MAX_REQUESTS: 5,
      WINDOW_SECONDS: 900
    }
  },

  CONTACT: {
    SUBMIT: {
      PER_IP: {
        KEY: "rate-limit:contact:ip:",
        MAX_REQUESTS: 5,
        WINDOW_SECONDS: 900
      }
    }
  },

  USER: {
    UPDATE_PROFILE: {
      PER_IP: {
        KEY: "rate-limit:user-update:ip:",
        MAX_REQUESTS: 10,
        WINDOW_SECONDS: 900
      }
    },
    ADMIN_MUTATION: {
      PER_IP_USER: {
        KEY: "rate-limit:admin-user-mutation:ip-user:",
        MAX_REQUESTS: 20,
        WINDOW_SECONDS: 900
      }
    }
  },

  CATEGORIES: {
    PER_IP: {
      KEY: "rate-limit:categories:ip:",
      MAX_REQUESTS: 100,
      WINDOW_SECONDS: 300
    }
  }
} as const;
