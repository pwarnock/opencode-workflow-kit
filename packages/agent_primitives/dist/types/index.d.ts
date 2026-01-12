export interface AgentPrimitive {
    id: string;
    name: string;
    version: string;
}
export interface AgentCapability {
    name: string;
    description: string;
    parameters?: Record<string, unknown>;
}
export interface AgentConfig {
    primitives: AgentPrimitive[];
    capabilities: AgentCapability[];
}
//# sourceMappingURL=index.d.ts.map