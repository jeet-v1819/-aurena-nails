#!/usr/bin/env node
/**
 * Wait until Netlify has published the production deploy for a given commit.
 *
 * Netlify starts a production deploy for every push to `main`. Running live
 * smoke tests immediately after a push would otherwise test the previous
 * release, so CI waits here until the deploy for the pushed commit is live.
 *
 * Environment:
 *   GITHUB_SHA      Commit to wait for (also accepted as argv[2]).
 *   NETLIFY_SITE    Netlify site slug (default: aurena-nails.netlify.app).
 *   WAIT_TIMEOUT_MS Maximum time to wait (default: 12 minutes).
 */

const site = process.env.NETLIFY_SITE || "aurena-nails.netlify.app";
const commit = process.argv[2] || process.env.GITHUB_SHA;
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 12 * 60 * 1000);
const intervalMs = 15_000;

if (!commit) {
  console.error("No commit SHA provided (set GITHUB_SHA or pass it as an argument).");
  process.exit(1);
}

const endpoint = `https://api.netlify.com/api/v1/sites/${site}/deploys?per_page=20`;
const deadline = Date.now() + timeoutMs;

console.log(`Waiting for the production deploy of ${commit} on ${site}…`);

async function poll() {
  const response = await fetch(endpoint, {
    headers: { accept: "application/json" }
  });
  if (!response.ok) {
    throw new Error(`Netlify API responded ${response.status}`);
  }
  const deploys = await response.json();
  const deploy = deploys.find(
    (item) => item.commit_ref === commit && item.context === "production"
  );

  if (!deploy) {
    return { state: "missing" };
  }

  if (deploy.state === "ready" && deploy.published_at) {
    console.log(
      `Deploy ${deploy.id} is live (build ${deploy.deploy_time ?? "?"}s, published ${deploy.published_at}).`
    );
    return { state: "ready" };
  }

  if (["error", "failed", "rejected"].includes(deploy.state)) {
    console.error(`Deploy ${deploy.id} finished in state "${deploy.state}".`);
    return { state: "failed" };
  }

  console.log(
    `Deploy ${deploy.id} state: ${deploy.state} (summary: ${deploy.summary?.status || "unknown"})`
  );
  return { state: "pending" };
}

while (Date.now() < deadline) {
  try {
    const result = await poll();
    if (result.state === "ready") process.exit(0);
    if (result.state === "failed") process.exit(1);
  } catch (error) {
    console.warn(`Deploy check failed: ${error.message}. Retrying…`);
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}

console.error(`Timed out after ${Math.round(timeoutMs / 1000)}s waiting for deploy ${commit}.`);
process.exit(1);
