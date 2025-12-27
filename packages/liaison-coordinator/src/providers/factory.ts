/**
 * Provider Factory
 *
 * Creates the appropriate provider instance based on configuration.
 * This is the single point of provider instantiation.
 */

import type { IssueSourceConfig, IssueSourceProvider, IssueSourceType } from './types.js';
import { GitHubProvider } from './github.js';

/**
 * Create a provider instance from configuration
 *
 * @param config - Provider configuration (GitHub, GitLab, Jira, etc.)
 * @returns Provider instance or null if type is 'none'
 */
export function createProvider(config: IssueSourceConfig): IssueSourceProvider | null {
  switch (config.type) {
    case 'github':
      return new GitHubProvider(config);

    case 'gitlab':
      // Future: return new GitLabProvider(config);
      throw new Error(
        'GitLab provider is not yet implemented. ' +
        'Contributions welcome at: https://github.com/pwarnock/liaison-toolkit'
      );

    case 'jira':
      // Future: return new JiraProvider(config);
      throw new Error(
        'Jira provider is not yet implemented. ' +
        'Contributions welcome at: https://github.com/pwarnock/liaison-toolkit'
      );

    case 'linear':
      // Future: return new LinearProvider(config);
      throw new Error(
        'Linear provider is not yet implemented. ' +
        'Contributions welcome at: https://github.com/pwarnock/liaison-toolkit'
      );

    case 'local':
      // Future: return new LocalProvider(config);
      throw new Error(
        'Local provider is not yet implemented. ' +
        'Contributions welcome at: https://github.com/pwarnock/liaison-toolkit'
      );

    case 'none':
      // No issue source - valid for Beads-only sync
      return null;

    default:
      throw new Error(`Unknown provider type: ${(config as any).type}`);
  }
}

/**
 * Get the provider type from a configuration object
 */
export function getProviderType(config: IssueSourceConfig): IssueSourceType {
  return config.type;
}

/**
 * Check if a provider type is currently supported
 */
export function isProviderSupported(type: IssueSourceType): boolean {
  return type === 'github' || type === 'none';
}

/**
 * Get list of all supported provider types
 */
export function getSupportedProviders(): IssueSourceType[] {
  return ['github', 'none'];
}

/**
 * Get list of all provider types (including unsupported)
 */
export function getAllProviderTypes(): IssueSourceType[] {
  return ['github', 'gitlab', 'jira', 'linear', 'local', 'none'];
}
