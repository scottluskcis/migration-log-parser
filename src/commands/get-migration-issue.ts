import * as commander from "commander";
import { parseFloatOption, parseIntOption } from "../utils.js";
import { Arguments } from "../types.js";
import VERSION from "../version.js";
import { init_client } from "../init.js";
import { parseMigrationLog, migrationSummariesToCSV } from "../migration.js";
import { MigrationSummary } from "../types.js";
import * as fs from "fs";
import * as path from "path";

const getMigrationIssueCommand = new commander.Command();
const { Option } = commander;

getMigrationIssueCommand
  .name("get-migration-issues")
  .description("Get migration issue for a repository")
  .version(VERSION)
  .addOption(
    new Option(
      "-o, --org-name <org>",
      "The name of the organization to process"
    ).env("ORG_NAME")
  )
  .addOption(
    new Option("-t, --access-token <token>", "GitHub access token").env(
      "ACCESS_TOKEN"
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
  .action(async (opts: Arguments) => {
    const { logger, client } = await init_client(opts);

    logger.info("Starting get migration issues...");

    const owner = opts.orgName;
    const migrationSummaries: MigrationSummary[] = [];
    const reposWithoutMigrationIssue: string[] = [];

    for await (const repo of client.listReposForOrg(
      owner,
      opts.pageSize ?? 50
    )) {
      logger.info(`Processing repo: ${repo.name}`);

      const migrationIssue = await client.findMigrationIssue(owner, repo.name);
      if (migrationIssue) {
        logger.info(
          `Migration issue found for ${repo.name}: ${migrationIssue.title}`
        );

        const migrationIssueCommentsIterator = client.listIssueComments(
          owner,
          repo.name,
          migrationIssue.number
        );

        for await (const comment of migrationIssueCommentsIterator) {
          const migrationSummary = parseMigrationLog(`${comment.body}`);
          if (migrationSummary) {
            logger.info(`Found migration log for ${repo.name}`);
            migrationSummaries.push(migrationSummary);
          }
        }
      } else {
        logger.info(`No migration issue found for ${repo.name}`);
        reposWithoutMigrationIssue.push(repo.name);
      }
    }

    // Output results
    logger.info(`Found ${migrationSummaries.length} migration logs`);
    logger.info(
      `Found ${reposWithoutMigrationIssue.length} repos without migration issues`
    );

    if (
      migrationSummaries.length > 0 ||
      reposWithoutMigrationIssue.length > 0
    ) {
      const outputDir = path.join(process.cwd(), "output");

      // Ensure output directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/:/g, "-");

      if (migrationSummaries.length > 0) {
        // Output as CSV
        const csvContent = migrationSummariesToCSV(migrationSummaries);

        const csvFilePath = path.join(
          outputDir,
          `${owner}-migration-summary-${timestamp}.csv`
        );
        fs.writeFileSync(csvFilePath, csvContent);
        logger.info(`Migration summary saved to ${csvFilePath}`);

        // Also output as JSON for programmatic use
        const jsonFilePath = path.join(
          outputDir,
          `${owner}-migration-summary-${timestamp}.json`
        );
        fs.writeFileSync(
          jsonFilePath,
          JSON.stringify(migrationSummaries, null, 2)
        );
        logger.info(`Migration summary saved to ${jsonFilePath}`);
      }

      // Output the list of repos without migration issues
      if (reposWithoutMigrationIssue.length > 0) {
        const missingIssuesFilePath = path.join(
          outputDir,
          `${owner}-repos-without-migration-issues-${timestamp}.json`
        );
        fs.writeFileSync(
          missingIssuesFilePath,
          JSON.stringify(reposWithoutMigrationIssue, null, 2)
        );
        logger.info(
          `Repos without migration issues saved to ${missingIssuesFilePath}`
        );

        // Also output as CSV for easy viewing
        const missingIssuesCsvFilePath = path.join(
          outputDir,
          `${owner}-repos-without-migration-issues-${timestamp}.csv`
        );
        fs.writeFileSync(
          missingIssuesCsvFilePath,
          "Repository Name\n" + reposWithoutMigrationIssue.join("\n")
        );
        logger.info(
          `Repos without migration issues saved to ${missingIssuesCsvFilePath}`
        );
      }
    }

    logger.info("Get Migration issues completed.");
  });

export default getMigrationIssueCommand;
