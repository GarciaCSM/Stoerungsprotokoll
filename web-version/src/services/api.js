import { API_ENDPOINTS } from '../config/api';

export async function checkHealth() {
  const response = await fetch(API_ENDPOINTS.HEALTH);
  if (!response.ok) {
    throw new Error(`Health check failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchSollHours() {
  const response = await fetch(API_ENDPOINTS.SOLL_HOURS);
  if (!response.ok) {
    throw new Error(`SOLL request failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function searchFa(query) {
  const response = await fetch(
    `${API_ENDPOINTS.SEARCH_FA}?query=${encodeURIComponent(query)}`
  );
  if (!response.ok) {
    throw new Error(`FA search failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function sendContext(payload) {
  const response = await fetch(API_ENDPOINTS.CONTEXT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Context sync failed: HTTP ${response.status}`);
  }
  return response.json();
}

export async function syncSession(payload) {
  const response = await fetch(API_ENDPOINTS.SESSION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Session sync failed: HTTP ${response.status} ${msg}`.trim());
  }
  return response.json();
}

export async function stopSession({ linie, schicht, bereich, datum, session_run_key }) {
  const params = new URLSearchParams({ linie, schicht, bereich, datum });
  if (session_run_key) params.set('session_run_key', session_run_key);
  const query = params.toString();
  const response = await fetch(`${API_ENDPOINTS.SESSION}?${query}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Stop session failed: HTTP ${response.status} ${msg}`.trim());
  }
  return response.json();
}

export async function loadSession({ linie, schicht, bereich, datum }) {
  const query = new URLSearchParams({ linie, schicht, bereich, datum }).toString();
  const response = await fetch(`${API_ENDPOINTS.SESSION}?${query}`);
  if (response.status === 404) return null;
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Load session failed: HTTP ${response.status} ${msg}`.trim());
  }
  return response.json();
}

export async function loadStoerungen({ linie, schicht, bereich, datum }) {
  const query = new URLSearchParams({ linie, schicht, bereich, datum }).toString();
  const response = await fetch(`${API_ENDPOINTS.STOERUNGEN}?${query}`);
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Load stoerungen failed: HTTP ${response.status} ${msg}`.trim());
  }
  return response.json();
}

export async function syncStoerung(payload) {
  const response = await fetch(API_ENDPOINTS.STOERUNGEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const msg = await response.text();
    throw new Error(`Stoerung sync failed: HTTP ${response.status} ${msg}`.trim());
  }
  return response.json();
}
