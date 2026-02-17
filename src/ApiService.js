import axios from "axios";
import API_URL from "./config";

export async function generateDistressReport({ file, startDate, endDate }) {
  const params = new URLSearchParams();
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);

  const formData = new FormData();
  formData.append("file", file);

  const query = params.toString();
  const url = `${API_URL}/api/distress-report${query ? `?${query}` : ""}`;

  const response = await axios.post(url, formData);
  return response.data;
}

export async function generateDistressPredicted({ file, startDate, endDate }) {
  const formData = new FormData();
  if (startDate) formData.append("start_date", startDate);
  if (endDate) formData.append("end_date", endDate);
  formData.append("file", file);

  const url = `${API_URL}/api/distress-predicted`;

  const response = await axios.post(url, formData, {
    responseType: "blob",
  });
  return response.data;
}
