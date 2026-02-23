import axios from "axios";

const api = axios.create({
  baseURL: `${process.env.REACT_APP_BACKEND_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token from localStorage on init
const token = localStorage.getItem("rankflow_token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("rankflow_token");
      localStorage.removeItem("rankflow_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
