/**
 * Rundeck API Client
 * Handles all HTTP communication with Rundeck REST API
 */

class RundeckClient {
  constructor(baseUrl, token, apiVersion = '41') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.token = token;
    this.apiVersion = apiVersion;
  }

  async request(method, endpoint, body = null) {
    const url = `${this.baseUrl}/api/${this.apiVersion}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'X-Rundeck-Auth-Token': this.token,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();
    
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (!response.ok) {
      const error = new Error(`Rundeck API error: ${response.status} ${response.statusText}`);
      error.status = response.status;
      error.response = data;
      throw error;
    }

    return data;
  }

  // Project operations
  async listProjects() {
    return this.request('GET', '/projects');
  }

  async getProject(project) {
    return this.request('GET', `/project/${encodeURIComponent(project)}`);
  }

  // Job operations
  async listJobs(project) {
    return this.request('GET', `/project/${encodeURIComponent(project)}/jobs`);
  }

  async getJob(jobId) {
    return this.request('GET', `/job/${encodeURIComponent(jobId)}`);
  }

  async runJob(jobId, options = {}) {
    const body = Object.keys(options).length > 0 ? { options } : {};
    return this.request('POST', `/job/${encodeURIComponent(jobId)}/run`, body);
  }

  // Execution operations
  async getExecution(executionId) {
    return this.request('GET', `/execution/${encodeURIComponent(executionId)}`);
  }

  async listExecutions(project, jobId = null) {
    if (jobId) {
      return this.request('GET', `/job/${encodeURIComponent(jobId)}/executions`);
    }
    return this.request('GET', `/project/${encodeURIComponent(project)}/executions`);
  }

  async abortExecution(executionId) {
    return this.request('POST', `/execution/${encodeURIComponent(executionId)}/abort`);
  }

  async waitForExecution(executionId, timeoutMs = 300000, pollIntervalMs = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const execution = await this.getExecution(executionId);
      const status = execution.status;

      console.log(`Execution ${executionId} status: ${status}`);

      if (status === 'succeeded') {
        return { ...execution, timedOut: false };
      }
      if (status === 'failed' || status === 'aborted') {
        const error = new Error(`Execution ${status}`);
        error.execution = execution;
        throw error;
      }

      await this.sleep(pollIntervalMs);
    }

    return { status: 'timeout', timedOut: true };
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = { RundeckClient };
