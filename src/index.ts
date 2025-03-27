import { config } from "dotenv";
config();

import * as commander from "commander";

import VERSION from "./version.js";
import getMigrationIssueCommand from "./commands/get-migration-issue.js";

const program = new commander.Command();

program
  .description(
    "Fetches and processes repository statistics from GitHub organizations"
  )
  .version(VERSION)
  .addCommand(getMigrationIssueCommand);

program.parse(process.argv);
