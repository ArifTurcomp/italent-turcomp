import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json"
  }
});

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const getErrorMessage = (error) =>
  error?.response?.data?.detail ||
  error?.response?.data?.message ||
  error?.message ||
  "Something went wrong. Please try again.";

const unwrap = async (request) => {
  try {
    const response = await request;
    return response.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
};

const api = {
  auth: {
    login: (payload) => unwrap(apiClient.post("/auth/login", payload)),
    register: (payload) => unwrap(apiClient.post("/auth/register", payload)),
    requestPasswordReset: (payload) =>
      unwrap(apiClient.post("/auth/password-reset/request", payload)),
    confirmPasswordReset: (payload) =>
      unwrap(apiClient.post("/auth/password-reset/confirm", payload)),
    refresh: (refreshToken) =>
      unwrap(apiClient.post("/auth/refresh", { refresh_token: refreshToken })),
    logout: () => unwrap(apiClient.post("/auth/logout"))
  },
  users: {
    me: () => unwrap(apiClient.get("/users/me")),
    updateMe: (payload) => unwrap(apiClient.put("/users/me", payload))
  },
  contacts: {
    list: (params = {}) => unwrap(apiClient.get("/contacts", { params })),
    get: (id) => unwrap(apiClient.get(`/contacts/${id}`)),
    create: (payload) => unwrap(apiClient.post("/contacts", payload)),
    update: (id, payload) => unwrap(apiClient.put(`/contacts/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/contacts/${id}`))
  },
  departments: {
    list: (params = {}) => unwrap(apiClient.get("/departments", { params })),
    get: (id) => unwrap(apiClient.get(`/departments/${id}`)),
    create: (payload) => unwrap(apiClient.post("/departments", payload)),
    update: (id, payload) => unwrap(apiClient.put(`/departments/${id}`, payload)),
    members: (id, params = {}) =>
      unwrap(apiClient.get(`/departments/${id}/members`, { params }))
  },
  jobs: {
    list: (params = {}) => unwrap(apiClient.get("/jobs", { params })),
    get: (id) => unwrap(apiClient.get(`/jobs/${id}`)),
    create: (payload) => unwrap(apiClient.post("/jobs", payload)),
    update: (id, payload) => unwrap(apiClient.put(`/jobs/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/jobs/${id}`))
  },
  community: {
    list: (params = {}) => unwrap(apiClient.get("/community", { params })),
    get: (id) => unwrap(apiClient.get(`/community/${id}`)),
    create: (payload) => unwrap(apiClient.post("/community", payload)),
    update: (id, payload) => unwrap(apiClient.put(`/community/${id}`, payload)),
    remove: (id) => unwrap(apiClient.delete(`/community/${id}`)),
    like: (id) => unwrap(apiClient.post(`/community/${id}/like`))
  }
};

export default api;
