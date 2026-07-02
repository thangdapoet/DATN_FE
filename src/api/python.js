import axios from "axios";

const API_BASE = "http://192.168.1.10:8000";

// ===============================
// 📌 1. Get history grouped by date
// ===============================
export const getHistoryGroupedByDateAsync = async () => {
  try {
    const res = await axios.get(`${API_BASE}/history/grouped-by-date`, {
      headers: {
        Accept: "application/json",
      },
    });

    return res.data;
  } catch (error) {
    console.error("Error fetching history grouped by date:", error);
    throw error;
  }
};

// ===============================
// 📌 2. Create a history entry (image_url + uid + status)
// ===============================
export const createHistoryAsync = async (payload) => {
  try {
    const res = await axios.post(`${API_BASE}/history/`, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data; // { message, data }
  } catch (err) {
    console.error("POST history error:", err.response?.data || err);
    throw err;
  }
};

// ===============================
// 📌 3. Upload image to FastAPI → return { image_url }
// ===============================
export const uploadHistoryImageAsync = async (fileBlob) => {
  try {
    const formData = new FormData();
    formData.append("file", fileBlob, "photo.jpg");

    const res = await axios.post(`${API_BASE}/history/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.data; // { success, image_url }
  } catch (err) {
    console.error("UPLOAD history image error:", err.response?.data || err);
    throw err;
  }
};
