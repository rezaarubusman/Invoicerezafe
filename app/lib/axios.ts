import axios from "axios";
import { useAuthStore } from "~/store/auth-store";

export const axiosInstance =
  axios.create({
    baseURL:
      import.meta.env.VITE_BASE_URL_API || "http://localhost:8000",

    headers: { "Content-Type": "application/json" },
  });

axiosInstance.interceptors.request.use(
  (config) => {
    const token =
      useAuthStore.getState()
        .accessToken;

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  }
);