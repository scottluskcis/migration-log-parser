import * as commander from "commander";
import { parseIntOption, parseFloatOption } from "../utils.js";
import { Arguments } from "../types.js";
import VERSION from "../version.js";
import { init_client } from "../init.js";
import * as fs from "fs";
import * as path from "path";

// Define extended Arguments type for this command
interface MissingReposArguments extends Arguments {
  sourceOrgName: string;
  sourceAccessToken?: string;
  sourceAppId?: string | undefined;
  sourcePrivateKey?: string | undefined;
  sourcePrivateKeyFile?: string | undefined;
  sourceAppInstallationId?: string | undefined;
}

const getMissingReposCommand = new commander.Command();
const { Option } = commander;

getMissingReposCommand
  .name("get-missing-repos")
  .description(
    "Identify repositories in source organization that are not present in target organization"
  )
  .version(VERSION)
  .addOption(
    new Option(
      "-o, --org-name <org>",
      "The name of the organization to process"
    ).env("ORG_NAME")
  )
  .addOption(
    new Option(
      "-s, --source-org-name <org>",
      "The name of the source organization to process"
    ).env("SOURCE_ORG_NAME")
  )
  .addOption(
    new Option("-t, --access-token <token>", "GitHub access token").env(
      "ACCESS_TOKEN"
    )
  )
  .addOption(
    new Option("--source-access-token <token>", "GitHub access token").env(
      "SOURCE_ACCESS_TOKEN"
    )
  )
  .addOption(
    new Option("-u, --base-url <url>", "GitHub API base URL")
      .env("BASE_URL")
      .default("https://api.github.com")
  )
  .addOption(
    new Option("--proxy-url <url>", "Proxy URL if required").env("PROXY_URL")
  )
  .addOption(
    new Option("-v, --verbose", "Enable verbose logging").env("VERBOSE")
  )
  .addOption(new Option("--app-id <id>", "GitHub App ID").env("APP_ID"))
  .addOption(
    new Option("--source-app-id <id>", "GitHub App ID").env("SOURCE_APP_ID")
  )
  .addOption(
    new Option("--private-key <key>", "GitHub App private key").env(
      "PRIVATE_KEY"
    )
  )
  .addOption(
    new Option(
      "--private-key-file <file>",
      "Path to GitHub App private key file"
    ).env("PRIVATE_KEY_FILE")
  )
  .addOption(
    new Option("--app-installation-id <id>", "GitHub App installation ID").env(
      "APP_INSTALLATION_ID"
    )
  )
  .addOption(
    new Option("--source-private-key <key>", "GitHub App private key").env(
      "SOURCE_PRIVATE_KEY"
    )
  )
  .addOption(
    new Option(
      "--source-private-key-file <file>",
      "Path to GitHub App private key file"
    ).env("SOURCE_PRIVATE_KEY_FILE")
  )
  .addOption(
    new Option(
      "--source-app-installation-id <id>",
      "GitHub App installation ID"
    ).env("SOURCE_APP_INSTALLATION_ID")
  )
  .addOption(
    new Option("--page-size <size>", "Number of items per page")
      .env("PAGE_SIZE")
      .default("10")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option("--extra-page-size <size>", "Extra page size")
      .env("EXTRA_PAGE_SIZE")
      .default("50")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option(
      "--rate-limit-check-interval <seconds>",
      "Interval for rate limit checks in seconds"
    )
      .env("RATE_LIMIT_CHECK_INTERVAL")
      .default("60")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option(
      "--retry-max-attempts <attempts>",
      "Maximum number of retry attempts"
    )
      .env("RETRY_MAX_ATTEMPTS")
      .default("3")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option(
      "--retry-initial-delay <milliseconds>",
      "Initial delay for retry in milliseconds"
    )
      .env("RETRY_INITIAL_DELAY")
      .default("1000")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option(
      "--retry-max-delay <milliseconds>",
      "Maximum delay for retry in milliseconds"
    )
      .env("RETRY_MAX_DELAY")
      .default("30000")
      .argParser(parseIntOption)
  )
  .addOption(
    new Option(
      "--retry-backoff-factor <factor>",
      "Backoff factor for retry delays"
    )
      .env("RETRY_BACKOFF_FACTOR")
      .default("2")
      .argParser(parseFloatOption)
  )
  .addOption(
    new Option(
      "--retry-success-threshold <count>",
      "Number of successful operations before resetting retry count"
    )
      .env("RETRY_SUCCESS_THRESHOLD")
      .default("5")
      .argParser(parseIntOption)
  )
  .action(async (opts: MissingReposArguments) => {
    // first create a client for the source, will need to map the source specific properties
    const { logger, client: sourceClient } = await init_client({
      ...opts,
      orgName: opts.sourceOrgName,
      accessToken: opts.sourceAccessToken,
      appId: opts.sourceAppId,
      privateKey: opts.sourcePrivateKey,
      privateKeyFile: opts.sourcePrivateKeyFile,
      appInstallationId: opts.sourceAppInstallationId,
    });

    const sourceOrg = opts.sourceOrgName;
    const targetOrg = opts.orgName;

    if (!sourceOrg || !targetOrg) {
      logger.error("Both source-org and target-org must be provided");
      process.exit(1);
    }

    logger.info(
      `Starting comparison between ${sourceOrg} (source) and ${targetOrg} (target)...`
    );

    // Collect all repositories from source organization
    logger.info(
      `Collecting repositories from source organization: ${sourceOrg}`
    );

    const sourceRepos = new Map<string, { name: string }>();

    try {
      for await (const repo of sourceClient.listReposForOrg(
        sourceOrg,
        opts.pageSize ?? 50
      )) {
        sourceRepos.set(repo.name.toLowerCase(), {
          name: repo.name,
        });
      }
    } catch (error) {
      logger.error(
        `Error fetching repositories from source organization: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }

    logger.info(
      `Found ${sourceRepos.size} repositories in source organization ${sourceOrg}`
    );

    const { client } = await init_client(opts);

    // Collect all repositories from target organization
    logger.info(
      `Collecting repositories from target organization: ${targetOrg}`
    );
    const targetRepos = new Map<string, { name: string }>();

    try {
      for await (const repo of client.listReposForOrg(
        targetOrg,
        opts.pageSize ?? 50
      )) {
        targetRepos.set(repo.name.toLowerCase(), { name: repo.name });
      }
    } catch (error) {
      logger.error(
        `Error fetching repositories from target organization: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      process.exit(1);
    }

    logger.info(
      `Found ${targetRepos.size} repositories in target organization ${targetOrg}`
    );

    // Identify missing repositories
    const missingRepos = [];

    for (const [repoKey, repoData] of sourceRepos.entries()) {
      if (!targetRepos.has(repoKey)) {
        missingRepos.push({
          name: repoData.name,
        });
      }
    }

    logger.info(
      `Found ${missingRepos.length} repositories in ${sourceOrg} that are not present in ${targetOrg}`
    );

    // Output results
    if (missingRepos.length > 0) {
      const outputDir = path.join(process.cwd(), "output");

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/:/g, "-");

      // Output as CSV - only repository names
      const csvFilePath = path.join(
        outputDir,
        `missing-repos-${sourceOrg}-to-${targetOrg}-${timestamp}.csv`
      );

      const csvHeader = "Repository Name\n";
      const csvRows = missingRepos.map((repo) => repo.name).join("\n");

      fs.writeFileSync(csvFilePath, csvHeader + csvRows);
      logger.info(`Missing repositories saved to ${csvFilePath}`);
    }

    logger.info("Repository comparison completed.");
  });

export default getMissingReposCommand;
