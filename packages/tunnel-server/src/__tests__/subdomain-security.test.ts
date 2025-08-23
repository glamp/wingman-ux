import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../index.js';

describe('Subdomain Security', () => {
  let app: any;
  let server: any;
  
  beforeEach(() => {
    const result = createApp();
    app = result.app;
    server = app.listen(0); // Use dynamic port
  });

  afterEach(() => {
    if (server) {
      server.close();
    }
  });

  it('should reject invalid session ID formats with 404', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'fakesessionid.wingmanux.com')
      .expect(404);

    expect(response.text).toContain('Invalid Session ID');
    expect(response.text).toContain('fakesessionid');
  });

  it('should reject single word session IDs', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'justonword.wingmanux.com')
      .expect(404);

    expect(response.text).toContain('Invalid Session ID');
  });

  it('should reject session IDs with numbers', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'session123.wingmanux.com')
      .expect(404);

    expect(response.text).toContain('Invalid Session ID');
  });

  it('should serve landing page for main domain', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'wingmanux.com')
      .expect(200);

    expect(response.text).toContain('Wingman Tunnel');
  });

  it('should serve landing page for www subdomain', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'www.wingmanux.com')
      .expect(200);

    expect(response.text).toContain('Wingman Tunnel');
  });

  it('should handle valid format but non-existent session', async () => {
    const response = await request(app)
      .get('/')
      .set('Host', 'ghost-whiskey.wingmanux.com')
      .expect(404);

    expect(response.text).toContain('Session Not Found');
    expect(response.text).toContain('ghost-whiskey');
  });
});