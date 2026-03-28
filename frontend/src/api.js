import axios from 'axios';

const api = axios.create({
  baseURL: '/',
  withCredentials: true,
  timeout: 15000,
});

// Intercept 401 responses — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Could redirect or notify — for now just let the component handle it
    }
    return Promise.reject(error);
  }
);

export default api;