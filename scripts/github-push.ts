import { Octokit } from '@octokit/rest';
import { execSync } from 'child_process';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function main() {
  console.log('Getting GitHub access token...');
  const accessToken = await getAccessToken();
  const octokit = new Octokit({ auth: accessToken });

  const { data: user } = await octokit.users.getAuthenticated();
  console.log(`Authenticated as: ${user.login}`);

  const repoName = 'fit-analyzer';
  const description = 'FIT file analysis app with AI-powered workout evaluation';

  let repoExists = false;
  try {
    await octokit.repos.get({ owner: user.login, repo: repoName });
    repoExists = true;
    console.log(`Repository ${repoName} already exists`);
  } catch (e: any) {
    if (e.status !== 404) throw e;
  }

  if (!repoExists) {
    console.log(`Creating repository: ${repoName}...`);
    await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: false,
      auto_init: false,
    });
    console.log('Repository created successfully');
  }

  const remoteUrl = `https://${accessToken}@github.com/${user.login}/${repoName}.git`;

  try {
    execSync('git remote remove origin', { stdio: 'pipe' });
  } catch (e) {}

  execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });

  console.log('Pushing code to GitHub...');
  execSync('git push -u origin main --force', { stdio: 'inherit' });

  console.log(`\nSuccess! Repository: https://github.com/${user.login}/${repoName}`);
}

main().catch(console.error);
