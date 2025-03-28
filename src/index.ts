import { config } from "dotenv";
config();

import * as commander from "commander";

import VERSION from "./version.js";
import parseMigrationIssuesCommand from "./commands/parse-migration-issues.js";
import getMissingReposCommand from "./commands/get-missing-repos.js";

const program = new commander.Command();

program
  .description(
    "Fetches and processes repository statistics from GitHub organizations"
  )
  .version(VERSION)
  .addCommand(parseMigrationIssuesCommand)
  .addCommand(getMissingReposCommand);

program.parse(process.argv);
