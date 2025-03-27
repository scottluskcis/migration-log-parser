import { createAuthConfig } from "./auth.js";
import { createLogger } from "./logger.js";
import { createOctokit } from "./octokit.js";
import { OctokitClient } from "./service.js";
import { Arguments, Logger } from "./types.js";

export const init_client = async (
  opts: Arguments
): Promise<{
  logger: Logger;
  client: OctokitClient;
}> => {
  const logFileName = `${opts.orgName}-repo-stats-${
    new Date().toISOString().split("T")[0]
  }.log`;

  const logger = await createLogger(opts.verbose, logFileName);
  const authConfig = createAuthConfig({ ...opts, logger: logger });

  const octokit = createOctokit(
    authConfig,
    opts.baseUrl,
    opts.proxyUrl,
    logger
  );

  const client = new OctokitClient(octokit);

  return { logger, client };
};
