import { api } from '@/lib/api';

global.fetch = jest.fn();

describe('API Client Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws an ApiError on non-2xx responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Bad Request' }),
    });

    await expect(api.get('/test')).rejects.toThrow('Bad Request');
  });

  it('handles empty responses smoothly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: new Headers({ 'content-length': '0' }),
    });

    const data = await api.get('/test');
    expect(data).toBeNull();
  });
});
