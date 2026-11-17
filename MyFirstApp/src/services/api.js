
import { API_BASE_URL } from "./parking-slots";

const BASE_URL = `${API_BASE_URL}/api`;

export async function checkBackendConnection() {
  const url = `${BASE_URL}/health`;

  console.log("Calling backend:", url);

  const response = await fetch(url);

  console.log("HTTP STATUS:", response.status);

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `Backend returned HTTP ${response.status}: ${responseText}`
    );
  }

  return JSON.parse(responseText);
}

export default BASE_URL;
