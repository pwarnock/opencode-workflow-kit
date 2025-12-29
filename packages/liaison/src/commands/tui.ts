import { Command } from 'commander';
import { launchTUI } from './tui/app';

export function createTUICommand(): Command {
  const command = new Command('tui');

  command
    .description('Launch interactive terminal user interface')
    .option('--no-color', 'Disable colored output')
    .action(async (options) => {
      await launchTUI(options);
    });

  return command;
}
