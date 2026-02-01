const { describe, it, mock, beforeEach } = require('node:test');
const assert = require('node:assert');
const { RundeckClient } = require('./rundeck-client');

describe('RundeckClient', () => {
  let client;
  let mockFetch;

  beforeEach(() => {
    client = new RundeckClient('https://rundeck.example.com', 'test-token', '41');
    mockFetch = mock.fn();
    global.fetch = mockFetch;
  });

  it('should construct API URL correctly', async () => {
    mockFetch.mock.mockImplementation(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('[]'),
    }));

    await client.listProjects();

    assert.strictEqual(mockFetch.mock.calls.length, 1);
    assert.strictEqual(
      mockFetch.mock.calls[0].arguments[0],
      'https://rundeck.example.com/api/41/projects'
    );
  });

  it('should include auth token in headers', async () => {
    mockFetch.mock.mockImplementation(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('{}'),
    }));

    await client.getProject('my-project');

    const options = mockFetch.mock.calls[0].arguments[1];
    assert.strictEqual(options.headers['X-Rundeck-Auth-Token'], 'test-token');
  });

  it('should throw on API error', async () => {
    mockFetch.mock.mockImplementation(() => Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('{"error": "not found"}'),
    }));

    await assert.rejects(
      () => client.getJob('invalid-id'),
      /Rundeck API error: 404/
    );
  });

  it('should send job options in request body', async () => {
    mockFetch.mock.mockImplementation(() => Promise.resolve({
      ok: true,
      text: () => Promise.resolve('{"id": "123"}'),
    }));

    await client.runJob('job-id', { env: 'prod', version: '1.0' });

    const options = mockFetch.mock.calls[0].arguments[1];
    const body = JSON.parse(options.body);
    assert.deepStrictEqual(body.options, { env: 'prod', version: '1.0' });
  });

  it('should remove trailing slash from base URL', () => {
    const clientWithSlash = new RundeckClient('https://rundeck.example.com/', 'token');
    assert.strictEqual(clientWithSlash.baseUrl, 'https://rundeck.example.com');
  });
});
