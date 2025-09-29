import { GET } from '../../app/api/health/route';
import { NextRequest } from 'next/server';

describe('/api/health', () => {
  it('should return health status', async () => {
    const request = new NextRequest('http://localhost:3001/api/health');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('status', 'healthy');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('service', 'zmemory-api');
    expect(data).toHaveProperty('version', '1.0.0');
    
    // Validate timestamp format
    expect(new Date(data.timestamp)).toBeInstanceOf(Date);
  });

  it('should have correct response headers', async () => {
    const request = new NextRequest('http://localhost:3001/api/health');
    const response = await GET(request);

    expect(response.headers.get('content-type')).toContain('application/json');
  });
});
