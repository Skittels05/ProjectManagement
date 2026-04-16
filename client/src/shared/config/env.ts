const fallbackApiUrl = "http://localhost:5000/api";

export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? fallbackApiUrl,
};
