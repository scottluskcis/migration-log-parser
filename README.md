# migration-log-parser

## Overview

Useful for running against a target org after a migration has occurred to search for the `Migration Log` issue and parse out the details. This can help with large orgs to save from having to search every repo individually

## Quickstart

1. Clone this repository

   ```bash
   git clone https://github.com/scottluskcis/migration-log-parser
   cd repo-stats-ts
   ```

2. Set up environment variables

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and set at minimum:

   ```bash
   ORG_NAME=your_organization_name
   ACCESS_TOKEN=your_github_personal_access_token
   ```

3. Install dependencies and build the project

   ```bash
   npm install
   npm run bundle
   ```

4. Run the tool

   ```bash
   npm start parse-migration-issues
   ```

5. Analyze the results in the generated files

## Environment Variables Configuration

The following environment variables can be configured in your `.env` file:

### Core Settings

- `ORG_NAME`: Name of the GitHub organization to analyze
- `BASE_URL`: GitHub API URL (default: https://api.github.com)
- `PROXY_URL`: Optional proxy URL for API requests

### Authentication

- `ACCESS_TOKEN`: GitHub Personal Access Token
- `APP_ID`: GitHub App ID (alternative to PAT)
- `PRIVATE_KEY`: GitHub App private key
- `PRIVATE_KEY_FILE`: Path to GitHub App private key file
- `APP_INSTALLATION_ID`: GitHub App installation ID

### Performance and Pagination

- `PAGE_SIZE`: Number of repositories to fetch per page (default: 10)
- `EXTRA_PAGE_SIZE`: Number of items to fetch in secondary queries (default: 50)
- `RATE_LIMIT_CHECK_INTERVAL`: How often to check rate limits (default: 25)

### Error Handling and Retry Logic

- `RETRY_MAX_ATTEMPTS`: Maximum retry attempts on failure (default: 3)
- `RETRY_INITIAL_DELAY`: Initial delay in ms before retry (default: 1000)
- `RETRY_MAX_DELAY`: Maximum delay in ms between retries (default: 30000)
- `RETRY_BACKOFF_FACTOR`: Exponential backoff multiplier (default: 2)
- `RETRY_SUCCESS_THRESHOLD`: Success count to reset retry counter (default: 5)

### Processing Options

- `VERBOSE`: Enable detailed logging (default: false)
- `RESUME_FROM_LAST_SAVE`: Resume from last saved state (default: false)
- `REPO_LIST`: Path to file with specific repositories to process
- `AUTO_PROCESS_MISSING`: Process missing repos after main run (default: false)

## Debugging in VS Code

The project includes VS Code configurations for both running and debugging the application:

### Run Configurations

To debug the application in VS Code:

1. Open the project in VS Code
2. Make sure your `.env` file is set up with the necessary configuration noted in [environment variables](#environment-variables) above.
3. Open the Run and Debug sidebar (`Ctrl+Shift+D` or `Cmd+Shift+D` on macOS)
4. Select one of the following debug configurations:

   - **parse-migration-issues**: Run and debug the parse-migration-issues command
   - **get-missing-repos**: Run and debug the get-missing-repos command

5. Press F5 or click the green play button to start debugging
