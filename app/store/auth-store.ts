import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "~/lib/axios";
import type { LoginValues, RegisterValues } from "~/lib/validation";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
}

interface AuthResponse {
  message: string;
  accessToken: string;
  user: AuthUser;
}

interface RegisterResponse {
  message: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (
    data: LoginValues
  ) => Promise<AuthResponse>;

  register: (
    data: RegisterValues
  ) => Promise<RegisterResponse>;

  logout: () => Promise<void>;

  getCurrentUser: () => Promise<void>;

  clearAuth: () => void;
}

export const useAuthStore =
  create<AuthState>()(
    persist(
      (set) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        isLoading: false,

        login: async (data) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<AuthResponse>(
                "/auth/login",
                {
                  email: data.email,
                  password: data.password,
                }
              );

            const {
              accessToken,
              user,
            } = response.data;

            set({
              accessToken,
              user,
              isAuthenticated: true,
              isLoading: false,
            });

            return response.data;
          } catch (error) {
            set({
              isLoading: false,
            });

            throw error;
          }
        },

        register: async (data) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<RegisterResponse>(
                "/auth/register",
                {
                  name: data.name,
                  email: data.email,
                  password: data.password,
                }
              );

            set({
              isLoading: false,
            });

            return response.data;
          } catch (error) {
            set({
              isLoading: false,
            });

            throw error;
          }
        },

        logout: async () => {
          try {
            await axiosInstance.post(
              "/auth/logout"
            );
          } finally {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
            });
          }
        },

        getCurrentUser: async () => {
          try {
            const response =
              await axiosInstance.get<{
                user: AuthUser;
              }>("/auth/me");

            set({
              user: response.data.user,
              isAuthenticated: true,
            });
          } catch (error) {
            set({
              user: null,
              accessToken: null,
              isAuthenticated: false,
            });

            throw error;
          }
        },

        clearAuth: () => {
          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });
        },
      }),
      {
        name: "auth-storage",

        partialize: (state) => ({
          accessToken:
            state.accessToken,
          user: state.user,
          isAuthenticated:
            state.isAuthenticated,
        }),
      }
    )
  );