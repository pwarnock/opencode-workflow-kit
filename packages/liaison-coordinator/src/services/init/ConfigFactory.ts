import { PACKAGE_METADATA } from "../../config/package-metadata.js";
import { GitMetadata } from "./ProjectDetector.js";

export class ConfigFactory {
  createProjectConfig(projectName: string) {
    return {
      name: projectName,
      version: "1.0.0",
      description: `${projectName} - ${PACKAGE_METADATA.integrations.cody.shortName} project`,
      integrations: {
        beads: {
          enabled: true,
          autoSync: false,
          syncInterval: 60,
        },
      },
    };
  }

  createBeadsSyncDoc() {
    return `# Beads Sync Command

Syncs ${PACKAGE_METADATA.integrations.cody.shortName} issues with ${PACKAGE_METADATA.integrations.beads.shortName} for unified task management.

## Usage
\`\`\`bash
cody beads-sync [options]
\`\`\`

## Options
- \`--dry-run\` - Show what would be synced without executing
- \`--direction <cody-to-beads|beads-to-cody|bidirectional>\` - Sync direction
- \`--force\` - Force sync and skip conflict resolution

## Integration
This command integrates with the ${PACKAGE_METADATA.cliName} CLI tool to provide seamless synchronization between ${PACKAGE_METADATA.integrations.cody.shortName} and ${PACKAGE_METADATA.integrations.beads.name}.
`;
  }

  createCodyBeadsConfig(
    projectName: string,
    templateType: string,
    gitMetadata?: GitMetadata,
  ) {
    return {
      version: "1.0.0",
      github: {
        owner: gitMetadata?.owner || "${GITHUB_OWNER}",
        repo: gitMetadata?.repo || projectName,
      },
      cody: {
        projectId: "${CODY_PROJECT_ID}",
        apiUrl: "https://api.cody.ai",
      },
      beads: {
        projectPath: `./${projectName === "." ? "" : projectName}`,
        autoSync: false,
        syncInterval: 60,
      },
      sync: {
        defaultDirection: "bidirectional" as const,
        conflictResolution: "manual" as const,
        preserveComments: true,
        preserveLabels: true,
        syncMilestones: false,
      },
      templates: {
        defaultTemplate: templateType,
      },
    };
  }

  getRequiredGitignoreEntries(): string[] {
    return ["cody-beads.config.json", ".env", "logs/", "*.log"];
  }
}
