/** API base URL: the local backend during development, the deployed API otherwise. */
export const API_BASE =
  globalThis.location?.hostname === 'localhost'
    ? 'http://localhost:3035/api/v1'
    : 'https://tube-ai-api.buildwithimran.online/api/v1';
