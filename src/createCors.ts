// src/createCors.ts
import cors from "cors";
import { defaultCorsOptions } from "./options";

/**
 * Create a Cross-Origin Resource Sharing (CORS) middleware
 * @param initialOptions
 * @returns a new cors middleware
 */
export const createCors = (initialOptions: Partial<cors.CorsOptions> = {}) => {
  const options = { ...defaultCorsOptions, ...initialOptions };

  return cors(options);
};
