import { Command } from 'commander';
import { InitOrchestrator } from '../services/init/InitOrchestrator.js';
import { PACKAGE_METADATA } from '../config/package-metadata.js';

/**
 * Init Command - Initialize new Liaison project
 */
export const initCommand = new Command('init')
  .description(`Initialize new ${PACKAGE_METADATA.productName} project`)
  .option('-t, --template <type>', 'Template type', 'minimal')
  .option('-n, --name <name>', 'Project name')
  .option('--install-beads', 'Install @beads/bd if not available')
  .action(async (options) => {
    const orchestrator = new InitOrchestrator();
    await orchestrator.run(options);
  });
