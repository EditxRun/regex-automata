import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const convertRegex = async (regex) => {
  const res = await axios.post(`${API_BASE_URL}/convert`, {
    regex,
  });
  return res.data;
};
