const USER_PROFILE = {
  AVATAR_UPLOAD: {
    ALLOWED_MIME_TYPES: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif"
    ]),
    MAX_SIZE_BYTES: 10 * 1024 * 1024
  }
};

export default USER_PROFILE;
