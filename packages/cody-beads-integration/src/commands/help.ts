/**
 * CLI Help Command
 * Provides enhanced help functionality with autocomplete support
 */

import { Command } from "commander";
import { helpManager } from "./enhanced-help.js";

/**
 * Create help command
 */
export function createHelpCommand(): Command {
  const helpCommand = new Command("help")
    .description("Display detailed help for commands")
    .argument("[command]", "Command to get help for")
    .option("--wizard", "Launch interactive help wizard", false)
    .option("--list", "List all available commands", false)
    .option("--search <query>", "Search for help on specific topic")
    .action(async (commandName, options) => {
      try {
        if (options.wizard) {
          await helpManager.showHelpWizard();
          return;
        }

        if (options.list) {
          await helpManager.listAllCommands();
          return;
        }

        if (options.search) {
          const suggestions = helpManager.searchCommandHelp(options.search);
          if (suggestions.length === 0) {
            console.log(`No help found for "${options.search}"`);
            return;
          }

          console.log(`\nSearch results for "${options.search}":`);
          suggestions.forEach((suggestion, index) => {
            console.log(
              `${index + 1}. ${suggestion.command} - ${suggestion.description}`,
            );
          });
          return;
        }

        if (commandName) {
          // This would need the program instance to work properly
          // For now, show basic help
          const topic = helpManager["helpTopics"].get(commandName);
          if (topic) {
            console.log(`\nHelp for ${commandName}:`);
            console.log(`Description: ${topic.description}`);
            console.log(`\nExamples:`);
            topic.examples.forEach((example) => {
              console.log(`  ${example}`);
            });
          } else {
            console.log(`No help found for command: ${commandName}`);
            await helpManager.suggestCommands(commandName);
          }
        } else {
          // Show general help
          console.log("\nCody-Beads Integration Help");
          console.log("==========================");
          console.log("\nAvailable commands:");
          console.log("  help [command]       - Get help for specific command");
          console.log("  help --wizard        - Interactive help wizard");
          console.log("  help --list          - List all commands");
          console.log("  help --search <query> - Search help topics");
          console.log("\nCommon commands:");
          console.log(
            "  sync                 - Synchronize data between systems",
          );
          console.log("  config               - Manage configuration");
          console.log("  template             - Work with project templates");
          console.log("  init                 - Initialize new projects");
          console.log("\nUse --help with any command for detailed options");
        }
      } catch (error) {
        console.error(
          "Help command failed:",
          error instanceof Error ? error.message : "Unknown error",
        );
      }
    });

  return helpCommand;
}
