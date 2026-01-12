// Placeholder for utility functions
// TODO: Add utility implementations

export function createAgentPrimitive(name: string, version: string): object {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, '-')}-${version}`,
    name,
    version,
    createdAt: new Date().toISOString(),
  };
}

export function validateAgentConfig(config: unknown): boolean {
  return typeof config === 'object' && config !== null;
}
