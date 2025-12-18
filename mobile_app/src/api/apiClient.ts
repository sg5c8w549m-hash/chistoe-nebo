const API_URL = "http://localhost:4000";


export async function api(
  path: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("token");

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(API_URL + path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  if (response.status === 204) return null;

  return response.json();
}
