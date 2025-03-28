import { MigrationLogEntry, MigrationSummary } from "./types.js";

/**
 * Extracts migration information from issue comment body
 * @param commentBody - Raw comment body text from GitHub issue
 * @returns Structured migration summary object or null if not a migration log
 */
export function parseMigrationLog(
  commentBody: string
): MigrationSummary | null {
  // Check if this is a migration log chunk
  if (!commentBody.includes("<details><summary>Log Chunk")) {
    return null;
  }

  const summary: MigrationSummary = {
    migrationId: "",
    sourceRepo: "",
    targetRepo: "",
    startedBy: "",
    startTime: "",
    completionTime: "",
    duration: 0,
    status: "unknown",
    warnings: [],
    errors: [],
  };

  // Extract log content from the markdown
  const logContentMatch = commentBody.match(/```\n([\s\S]*?)\n```/);
  if (!logContentMatch || !logContentMatch[1]) {
    return null;
  }

  const logContent = logContentMatch[1];
  const logLines = logContent.split("\n");

  // Parse the log entries
  const logEntries: MigrationLogEntry[] = logLines
    .map((line) => {
      const match = line.match(/\[(.+?)\] (\w+) -- (.*)/);
      if (!match) return null;

      return {
        timestamp: new Date(match[1]),
        level: match[2] as "INFO" | "WARN" | "ERROR",
        message: match[3],
      };
    })
    .filter(Boolean) as MigrationLogEntry[];

  // Find migration start info
  const startEntry = logEntries.find(
    (entry) =>
      entry.level === "INFO" && entry.message.includes("Migration started by")
  );

  if (startEntry) {
    const startMatch = startEntry.message.match(
      /Migration started by (\w+) from (https:\/\/github\.com\/[^\s]+) to ([^\s]+)/
    );
    if (startMatch) {
      summary.startedBy = startMatch[1];
      summary.sourceRepo = startMatch[2];
      summary.targetRepo = startMatch[3];
      summary.startTime = startEntry.timestamp.toISOString();
    }
  }

  // Find migration ID
  const idEntry = logEntries.find(
    (entry) => entry.level === "INFO" && entry.message.includes("Migration ID:")
  );

  if (idEntry) {
    const idMatch = idEntry.message.match(/Migration ID: ([a-f0-9-]+)/);
    if (idMatch) {
      summary.migrationId = idMatch[1];
    }
  }

  // Find completion time
  const completeEntry = logEntries.find(
    (entry) => entry.level === "INFO" && entry.message === "Migration complete"
  );

  if (completeEntry) {
    summary.completionTime = completeEntry.timestamp.toISOString();
    summary.status = "completed";

    // Calculate duration in seconds
    if (summary.startTime) {
      const start = new Date(summary.startTime).getTime();
      const end = completeEntry.timestamp.getTime();
      summary.duration = Math.round((end - start) / 1000);
    }
  }

  // Collect warnings
  summary.warnings = logEntries
    .filter((entry) => entry.level === "WARN")
    .map((entry) => entry.message);

  // Collect errors
  summary.errors = logEntries
    .filter((entry) => entry.level === "ERROR")
    .map((entry) => entry.message);

  return summary;
}

/**
 * Formats migration summaries into CSV format
 * @param summaries - Array of migration summary objects
 * @returns CSV string with headers
 */
export function migrationSummariesToCSV(summaries: MigrationSummary[]): string {
  const headers = [
    "Migration ID",
    "Source Repository",
    "Target Repository",
    "Started By",
    "Start Time",
    "Completion Time",
    "Duration (seconds)",
    "Status",
    "Warning Count",
    "Error Count",
  ].join(",");

  const rows = summaries.map((summary) =>
    [
      summary.migrationId,
      summary.sourceRepo,
      summary.targetRepo,
      summary.startedBy,
      summary.startTime,
      summary.completionTime,
      summary.duration,
      summary.status,
      summary.warnings.length,
      summary.errors.length,
    ]
      .map((value) => `"${value}"`)
      .join(",")
  );

  return [headers, ...rows].join("\n");
}
