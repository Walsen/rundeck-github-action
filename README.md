# Rundeck API GitHub Action

[![CI](https://github.com/Walsen/rundeck-github-action/actions/workflows/ci.yml/badge.svg)](https://github.com/Walsen/rundeck-github-action/actions/workflows/ci.yml)
[![Release](https://github.com/Walsen/rundeck-github-action/actions/workflows/release.yml/badge.svg)](https://github.com/Walsen/rundeck-github-action/actions/workflows/release.yml)

A GitHub Action to interact with Rundeck features through its REST API. Supports running jobs, managing executions, and querying project/job information.

## Features

- Run Rundeck jobs with optional parameters
- Wait for job completion with configurable timeout
- Get job and execution details
- List projects, jobs, and executions
- Abort running executions

## Development

```bash
# Install dependencies
npm install

# Build the action (required before committing)
npm run build
```

The `dist/` folder must be committed — GitHub Actions runs the compiled code directly.

## Usage

### Prerequisites

1. A Rundeck server with API access enabled
2. A Rundeck API token with appropriate permissions
3. Store your API token as a GitHub secret (e.g., `RUNDECK_TOKEN`)

### Basic Example - Run a Job

```yaml
- name: Run Rundeck Job
  uses: Walsen/rundeck-github-action@v1
  with:
    rundeck_url: ${{ secrets.RUNDECK_URL }}
    rundeck_token: ${{ secrets.RUNDECK_TOKEN }}
    action: run_job
    job_id: 'your-job-uuid'
```

### Run Job with Options and Wait for Completion

```yaml
- name: Deploy Application
  id: deploy
  uses: Walsen/rundeck-github-action@v1
  with:
    rundeck_url: ${{ secrets.RUNDECK_URL }}
    rundeck_token: ${{ secrets.RUNDECK_TOKEN }}
    action: run_job
    job_id: 'deploy-job-uuid'
    job_options: '{"environment": "production", "version": "1.2.3"}'
    wait_for_completion: 'true'
    timeout: '600'

- name: Check deployment result
  run: |
    echo "Execution ID: ${{ steps.deploy.outputs.execution_id }}"
    echo "Status: ${{ steps.deploy.outputs.execution_status }}"
    echo "URL: ${{ steps.deploy.outputs.execution_url }}"
```

### List Jobs in a Project

```yaml
- name: List Jobs
  uses: Walsen/rundeck-github-action@v1
  with:
    rundeck_url: ${{ secrets.RUNDECK_URL }}
    rundeck_token: ${{ secrets.RUNDECK_TOKEN }}
    action: list_jobs
    project: 'my-project'
```

### Get Execution Status

```yaml
- name: Check Execution
  uses: Walsen/rundeck-github-action@v1
  with:
    rundeck_url: ${{ secrets.RUNDECK_URL }}
    rundeck_token: ${{ secrets.RUNDECK_TOKEN }}
    action: get_execution
    execution_id: '12345'
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `rundeck_url` | Rundeck server URL | Yes | - |
| `rundeck_token` | Rundeck API token | Yes | - |
| `api_version` | Rundeck API version | No | `41` |
| `action` | Action to perform (see below) | Yes | - |
| `project` | Project name | Depends on action | - |
| `job_id` | Job UUID | Depends on action | - |
| `execution_id` | Execution ID | Depends on action | - |
| `job_options` | Job options as JSON | No | `{}` |
| `wait_for_completion` | Wait for job to finish | No | `false` |
| `timeout` | Timeout in seconds | No | `300` |
| `poll_interval` | Poll interval in seconds | No | `10` |

## Actions

| Action | Description | Required Inputs |
|--------|-------------|-----------------|
| `run_job` | Execute a Rundeck job | `job_id` |
| `get_job_info` | Get job details | `job_id` |
| `list_jobs` | List jobs in a project | `project` |
| `get_execution` | Get execution details | `execution_id` |
| `list_executions` | List executions | `job_id` or `project` |
| `get_project_info` | Get project details | `project` |
| `list_projects` | List all projects | - |
| `abort_execution` | Abort a running execution | `execution_id` |

## Outputs

| Output | Description |
|--------|-------------|
| `response` | Full JSON response from Rundeck API |
| `execution_id` | Execution ID (for run_job action) |
| `execution_status` | Execution status (succeeded, failed, aborted, running) |
| `execution_url` | URL to view the execution in Rundeck |

## Complete Workflow Example

```yaml
name: Deploy with Rundeck

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Run deployment job
        id: deploy
        uses: Walsen/rundeck-github-action@v1
        with:
          rundeck_url: ${{ secrets.RUNDECK_URL }}
          rundeck_token: ${{ secrets.RUNDECK_TOKEN }}
          action: run_job
          job_id: ${{ vars.DEPLOY_JOB_ID }}
          job_options: '{"version": "${{ github.sha }}", "environment": "production"}'
          wait_for_completion: 'true'
          timeout: '900'

      - name: Notify on success
        if: success()
        run: echo "Deployment succeeded! Execution URL - ${{ steps.deploy.outputs.execution_url }}"

      - name: Notify on failure
        if: failure()
        run: echo "Deployment failed! Check ${{ steps.deploy.outputs.execution_url }}"
```

## License

MIT
