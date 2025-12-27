/**
 * Provider Module Index
 *
 * Central export point for all provider-related types and implementations.
 */

// Types
export type {
  IssueSourceType,
  IssueSourceProvider,
  NormalizedIssue,
  NormalizedComment,
  FetchIssuesOptions,
  FetchPullRequestsOptions,
  CreateIssueInput,
  UpdateIssueInput,
  IssueSourceConfig,
  GitHubProviderConfig,
  GitLabProviderConfig,
  JiraProviderConfig,
  LinearProviderConfig,
  LocalProviderConfig,
  NoProviderConfig,
  ProviderFactory,
} from './types.js';

// Implementations
export { GitHubProvider, createGitHubProvider } from './github.js';

// Factory
export { createProvider, getProviderType } from './factory.js';
