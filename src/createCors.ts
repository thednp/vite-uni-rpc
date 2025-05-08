// src/createCors.ts
import cors from "cors";

const defaultCorsOptions: cors.CorsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
};

/**
 * Create a Cross-Origin Resource Sharing (CORS) middleware
 * @param initialOptions
 * @returns a new cors middleware
 */
export const createCors = (initialOptions: Partial<cors.CorsOptions> = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };

  return cors(options);
};
