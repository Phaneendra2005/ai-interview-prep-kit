// Centralized API client for frontend -> backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'init' in options && options.credentials ? options.credentials : 'include', // default to include for sessions
  });

  if (!response.ok) {
    let errorMessage = 'An error occurred';
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      errorMessage = response.statusText;
    }
    throw new ApiError(response.status, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null;
  }

  return response.json();
}

export const api = {
  get: (endpoint: string) => fetchWithAuth(endpoint, { method: 'GET' }),
  post: (endpoint: string, data?: any) => fetchWithAuth(endpoint, { 
    method: 'POST', 
    body: data ? JSON.stringify(data) : undefined 
  }),
  put: (endpoint: string, data?: any) => fetchWithAuth(endpoint, { 
    method: 'PUT', 
    body: data ? JSON.stringify(data) : undefined 
  }),
  delete: (endpoint: string) => fetchWithAuth(endpoint, { method: 'DELETE' }),
};
