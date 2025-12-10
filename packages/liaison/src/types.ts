export interface CLIPlugin {
  name: string;
  version: string;
  description: string;
  commands: PluginCommand[];
  middleware?: PluginMiddleware[];
  hooks?: PluginHooks;
}

export interface PluginCommand {
  name: string;
  description: string;
  options?: CommandOption[];
  handler: CommandHandler;
}

export interface CommandOption {
  name: string;
  description: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  default?: any;
}

export interface PluginMiddleware {
  name: string;
  execute: MiddlewareFunction;
}

export interface PluginHooks {
  beforeCommand?: (command: string, args: any[]) => Promise<void>;
  afterCommand?: (command: string, result: any) => Promise<void>;
  onError?: (error: Error, command: string) => Promise<void>;
}

export type CommandHandler = (args: any, options: any) => Promise<any>;
export type MiddlewareFunction = (context: any, next: () => Promise<any>) => Promise<any>;

export interface PluginManager {
  loadPlugin(plugin: CLIPlugin): Promise<void>;
  unloadPlugin(name: string): Promise<void>;
  executeCommand(commandName: string, args: any[], options: any): Promise<any>;
  listPlugins(): CLIPlugin[];
}