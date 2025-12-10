import { UnifiedPluginManager } from './plugin-manager.js';
import { liaisonPlugin } from './liaison-plugin.js';

// Example of how to consume the plugin system
async function demonstratePluginConsumption() {
  // 1. Create plugin manager instance
  const pluginManager = new UnifiedPluginManager();
  
  // 2. Load the Liaison integration plugin
  await pluginManager.loadPlugin(liaisonPlugin);
  
  // 3. List available commands
  console.log('Available commands:');
  const commands = pluginManager.listCommands();
  commands.forEach(cmd => {
    console.log(`  ${cmd.name} - ${cmd.description} (from ${cmd.plugin})`);
  });
  
  // 4. Execute a command
  console.log('\nExecuting sync command...');
  try {
    const result = await pluginManager.executeCommand('sync', [], { force: true });
    console.log('Sync result:', result);
  } catch (error) {
    console.error('Sync failed:', error);
  }
  
  // 5. Execute Beads commands
  console.log('\nCreating a test issue...');
  try {
    const result = await pluginManager.executeCommand('beads-create', 
      { title: 'Test issue from plugin' } as any, 
      { type: 'task', priority: 1 });
    console.log('Create result:', result);
  } catch (error) {
    console.error('Create failed:', error);
  }
  
  // 6. Check status
  console.log('\nChecking sync status...');
  try {
    const status = await pluginManager.executeCommand('status', [], {});
    console.log('Status result:', status);
  } catch (error) {
    console.error('Status check failed:', error);
  }
}

// Export for use in other modules
export { demonstratePluginConsumption };

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstratePluginConsumption();
}