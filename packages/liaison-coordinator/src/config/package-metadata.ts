/**
 * Package Metadata Configuration
 * Centralized configuration for package names and metadata
 * to avoid hardcoding throughout the codebase
 */

export interface PackageMetadata {
  /**
   * The npm package name (scoped)
   */
  packageName: string;

  /**
   * The package namespace (organization/author)
   */
  namespace: string;

  /**
   * The package short name (without namespace)
   */
  shortName: string;

  /**
   * The CLI command name
   */
  cliName: string;

  /**
   * The product name (e.g., "Liaison")
   */
  productName: string;

  /**
   * Integration metadata
   */
  integrations: {
    cody: { name: string; shortName: string };
    beads: { name: string; shortName: string };
  };

  /**
   * Current version
   */
  version: string;

  /**
   * Package description
   */
  description: string;
}

/**
 * Centralized package metadata configuration
 * This allows for easy updates and consistency across the codebase
 */
export const PACKAGE_METADATA: PackageMetadata = {
  packageName: '@pwarnock/liaison',
  namespace: 'pwarnock',
  shortName: 'liaison',
  cliName: 'liaison',
  productName: 'Liaison',
  integrations: {
    cody: { name: 'Cody Product Builder Toolkit', shortName: 'Cody PBT' },
    beads: { name: 'Beads Issue Tracker', shortName: 'Beads' },
  },
  version: '0.5.0',
  description:
    'Seamless integration between Cody Product Builder Toolkit and Beads for AI-driven development workflows',
} as const;

/**
 * Get the full package name for npm/yarn/pnpm installation
 */
export function getPackageName(): string {
  return PACKAGE_METADATA.packageName;
}

/**
 * Get the CLI command name
 */
export function getCliName(): string {
  return PACKAGE_METADATA.cliName;
}

/**
 * Get the package name for use in documentation and help text
 */
export function getDisplayName(): string {
  return PACKAGE_METADATA.shortName;
}

/**
 * Get package metadata for use in templates and generated files
 */
export function getPackageMetadata(): PackageMetadata {
  return PACKAGE_METADATA;
}

/**
 * Get the initialization message
 */
export function getInitMessage(): string {
  const { productName, integrations } = PACKAGE_METADATA;
  return `Initializing ${productName}, an integration of ${integrations.cody.name} (${integrations.cody.shortName}) and ${integrations.beads.name}`;
}
