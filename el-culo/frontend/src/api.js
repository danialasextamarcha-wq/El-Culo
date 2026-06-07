import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_WS_URL || '',
});

export default api;
