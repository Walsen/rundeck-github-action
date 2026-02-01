const core = require('@actions/core');
const { RundeckClient } = require('./rundeck-client');

async function run() {
  try {
    // Get inputs
    const rundeckUrl = core.getInput('rundeck_url', { required: true });
    const rundeckToken = core.getInput('rundeck_token', { required: true });
    const apiVersion = core.getInput('api_version') || '41';
    const action = core.getInput('action', { required: true });
    const project = core.getInput('project');
    const jobId = core.getInput('job_id');
    const executionId = core.getInput('execution_id');
    const jobOptionsRaw = core.getInput('job_options') || '{}';
    const waitForCompletion = core.getInput('wait_for_completion') === 'true';
    const timeout = parseInt(core.getInput('timeout') || '300', 10) * 1000;
    const pollInterval = parseInt(core.getInput('poll_interval') || '10', 10) * 1000;

    // Parse job options
    let jobOptions = {};
    try {
      jobOptions = JSON.parse(jobOptionsRaw);
    } catch (e) {
      throw new Error(`Invalid job_options JSON: ${e.message}`);
    }

    // Initialize client
    const client = new RundeckClient(rundeckUrl, rundeckToken, apiVersion);

    core.info(`Rundeck Action: ${action}`);
    core.info(`URL: ${rundeckUrl}`);

    let response;

    switch (action) {
      case 'list_projects':
        response = await client.listProjects();
        break;

      case 'get_project_info':
        if (!project) throw new Error('project is required for get_project_info');
        response = await client.getProject(project);
        break;

      case 'list_jobs':
        if (!project) throw new Error('project is required for list_jobs');
        response = await client.listJobs(project);
        break;

      case 'get_job_info':
        if (!jobId) throw new Error('job_id is required for get_job_info');
        response = await client.getJob(jobId);
        break;

      case 'run_job':
        if (!jobId) throw new Error('job_id is required for run_job');
        response = await client.runJob(jobId, jobOptions);
        
        const execId = response.id;
        const execUrl = `${rundeckUrl}/project/${project || 'default'}/execution/show/${execId}`;
        
        core.setOutput('execution_id', execId);
        core.setOutput('execution_url', execUrl);
        core.info(`Execution started: ${execId}`);
        core.info(`Execution URL: ${execUrl}`);

        if (waitForCompletion) {
          core.info(`Waiting for completion (timeout: ${timeout / 1000}s)...`);
          const result = await client.waitForExecution(execId, timeout, pollInterval);
          
          if (result.timedOut) {
            core.setFailed('Execution timed out');
            core.setOutput('execution_status', 'timeout');
            return;
          }
          
          core.setOutput('execution_status', result.status);
          response = result;
        } else {
          core.setOutput('execution_status', response.status);
        }
        break;

      case 'get_execution':
        if (!executionId) throw new Error('execution_id is required for get_execution');
        response = await client.getExecution(executionId);
        core.setOutput('execution_id', executionId);
        core.setOutput('execution_status', response.status);
        break;

      case 'list_executions':
        if (!jobId && !project) {
          throw new Error('job_id or project is required for list_executions');
        }
        response = await client.listExecutions(project, jobId);
        break;

      case 'abort_execution':
        if (!executionId) throw new Error('execution_id is required for abort_execution');
        response = await client.abortExecution(executionId);
        core.setOutput('execution_status', response.abort?.status || 'aborted');
        break;

      default:
        throw new Error(`Unknown action: ${action}. Valid actions: run_job, get_job_info, list_jobs, get_execution, list_executions, get_project_info, list_projects, abort_execution`);
    }

    core.setOutput('response', JSON.stringify(response));
    core.info('Action completed successfully');

  } catch (error) {
    core.setFailed(error.message);
    if (error.response) {
      core.error(`API Response: ${JSON.stringify(error.response)}`);
    }
  }
}

run();
