import { getEnv } from "./env.js";

export function getOpenApiConfig() {
  const env = getEnv();
  return {
    enabled: env.OPENAPI_ENABLED,
    jsonPath: env.OPENAPI_JSON_PATH,
    swaggerUiEnabled: env.SWAGGER_UI_ENABLED,
    swaggerUiPath: env.SWAGGER_UI_PATH,
  };
}
