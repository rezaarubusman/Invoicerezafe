import { create } from "zustand";
import { persist } from "zustand/middleware";
import { axiosInstance } from "~/lib/axios";
import type {
  ChangePasswordValues,
  ForgotPasswordValues,
  LoginValues,
  RegisterValues,
  ResetPasswordValues,
} from "~/lib/validation";

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

interface MessageResponse {
  message: string;
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

  verifyEmail: (
    token: string
  ) => Promise<MessageResponse>;

  resendVerification: (
    email: string
  ) => Promise<MessageResponse>;

  forgotPassword: (
    data: ForgotPasswordValues
  ) => Promise<MessageResponse>;

  resetPassword: (
    data: ResetPasswordValues & {
      token: string;
    }
  ) => Promise<MessageResponse>;

  changePassword: (
    data: ChangePasswordValues
  ) => Promise<MessageResponse>;

  logout: () => Promise<void>;

  getCurrentUser: () => Promise<void>;

  clearAuth: () => void;
}

export const useAuthStore =
  create<AuthState>()(
    persist(
      (set, get) => ({
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

        verifyEmail: async (token) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<MessageResponse>(
                "/auth/verify-email",
                {
                  token,
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

        resendVerification: async (email) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<MessageResponse>(
                "/auth/resend-verification",
                {
                  email,
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

        forgotPassword: async (data) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<MessageResponse>(
                "/auth/forgot-password",
                {
                  email: data.email,
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

        resetPassword: async (data) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.post<MessageResponse>(
                "/auth/reset-password",
                {
                  token: data.token,
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

        changePassword: async (data) => {
          set({
            isLoading: true,
          });

          try {
            const response =
              await axiosInstance.patch<MessageResponse>(
                "/auth/change-password",
                {
                  currentPassword:
                    data.currentPassword,
                  newPassword:
                    data.newPassword,
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
          const token =
            get().accessToken;

          set({
            user: null,
            accessToken: null,
            isAuthenticated: false,
          });

          try {
            await axiosInstance.post(
              "/auth/logout",
              undefined,
              token
                ? {
                    headers: {
                      Authorization:
                        `Bearer ${token}`,
                    },
                  }
                : undefined
            );
          } catch {
            // Local auth state should still be cleared if the server session is already gone.
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
