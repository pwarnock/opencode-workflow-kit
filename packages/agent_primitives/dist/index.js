// src/utils/index.ts
function createAgentPrimitive(name, version) {
  return {
    id: `${name.toLowerCase().replace(/\s+/g, "-")}-${version}`,
    name,
    version,
    createdAt: new Date().toISOString()
  };
}
function validateAgentConfig(config) {
  return typeof config === "object" && config !== null;
}
// src/schemas/mcp-schemas.json
var mcp_schemas_default = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://schemas.liaison-toolkit.dev/mcp-schemas.json",
  title: "MCP Server Schemas",
  description: "JSON schemas for MCP (Model Context Protocol) server configurations",
  type: "object",
  properties: {
    servers: {
      type: "array",
      items: { $ref: "#/$defs/mcpServer" }
    }
  },
  $defs: {
    mcpServer: {
      type: "object",
      required: ["name", "command"],
      properties: {
        name: { type: "string" },
        command: { type: "string" },
        args: { type: "array", items: { type: "string" } },
        env: { type: "object", additionalProperties: { type: "string" } }
      }
    }
  }
};
// src/schemas/mcp-servers.json
var mcp_servers_default = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://opencode.ai/schemas/mcp-servers.json",
  title: "MCP Servers Configuration Schema",
  description: "Schema for MCP server configuration files",
  type: "object",
  required: [
    "version",
    "name",
    "description",
    "servers"
  ],
  properties: {
    $schema: {
      type: "string",
      description: "JSON Schema reference"
    },
    version: {
      type: "string",
      pattern: "^\\d+\\.\\d+\\.\\d+$",
      description: "Configuration version following semantic versioning"
    },
    name: {
      type: "string",
      description: "Unique name for this configuration"
    },
    description: {
      type: "string",
      description: "Human-readable description of the configuration"
    },
    inherits: {
      type: "string",
      description: "Path to parent configuration file to inherit from"
    },
    servers: {
      type: "object",
      patternProperties: {
        "^[a-zA-Z][a-zA-Z0-9_-]*$": {
          type: "object",
          required: ["name", "description", "enabled"],
          properties: {
            name: {
              type: "string",
              description: "Server name"
            },
            description: {
              type: "string",
              description: "Server description"
            },
            enabled: {
              type: "boolean",
              description: "Whether the server is enabled"
            },
            command: {
              oneOf: [
                {
                  type: "array",
                  items: {
                    type: "string"
                  },
                  description: "Command to start the server"
                },
                {
                  type: "object",
                  patternProperties: {
                    "^(windows|darwin|linux|fallback)$": {
                      type: "array",
                      items: {
                        type: "string"
                      }
                    }
                  }
                }
              ]
            },
            args: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Arguments to pass to the server command"
            },
            env: {
              type: "object",
              patternProperties: {
                "^[A-Z_][A-Z0-9_]*$": {
                  type: "string"
                }
              },
              description: "Environment variables for the server"
            },
            timeout: {
              type: "integer",
              minimum: 1000,
              description: "Server timeout in milliseconds"
            },
            restart_on_failure: {
              type: "boolean",
              description: "Whether to restart the server on failure"
            },
            max_restarts: {
              type: "integer",
              minimum: 0,
              maximum: 10,
              description: "Maximum number of restart attempts"
            },
            health_check: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                interval: { type: "integer", minimum: 1000 },
                endpoint: { type: "string" },
                timeout: { type: "integer", minimum: 1000 }
              }
            },
            resources: {
              type: "object",
              properties: {
                memory_limit: { type: "string", pattern: "^\\d+[KMGT]?B$" },
                cpu_limit: { type: "integer", minimum: 1, maximum: 16 },
                max_connections: { type: "integer", minimum: 1 }
              }
            }
          }
        }
      }
    },
    global_settings: {
      type: "object",
      properties: {
        default_timeout: {
          type: "integer",
          minimum: 1000,
          description: "Default timeout for all servers"
        },
        max_concurrent_servers: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description: "Maximum concurrent servers"
        },
        auto_restart: {
          type: "boolean",
          description: "Automatically restart failed servers"
        },
        health_check_interval: {
          type: "integer",
          minimum: 1000,
          description: "Health check interval in milliseconds"
        },
        log_level: {
          type: "string",
          enum: ["debug", "info", "warn", "error"],
          description: "Logging level"
        },
        enable_metrics: {
          type: "boolean",
          description: "Enable metrics collection"
        },
        cache_responses: {
          type: "boolean",
          description: "Cache server responses"
        },
        cache_ttl: {
          type: "integer",
          minimum: 0,
          description: "Cache time-to-live in seconds"
        }
      }
    },
    project_settings: {
      type: "object",
      properties: {
        auto_detect_servers: {
          type: "boolean",
          description: "Automatically detect required servers"
        },
        respect_gitignore: {
          type: "boolean",
          description: "Respect .gitignore files"
        },
        project_aware: {
          type: "boolean",
          description: "Enable project-aware behavior"
        },
        disable_external_servers: {
          type: "boolean",
          description: "Disable external network servers"
        },
        enable_project_lsp: {
          type: "boolean",
          description: "Enable project-specific LSP servers"
        }
      }
    },
    language_servers: {
      type: "object",
      patternProperties: {
        "^[a-z]+$": {
          type: "object",
          required: ["server", "extensions"],
          properties: {
            server: {
              type: "string",
              description: "Language server executable"
            },
            args: {
              type: "array",
              items: { type: "string" },
              description: "Arguments for the language server"
            },
            extensions: {
              type: "array",
              items: {
                type: "string",
                pattern: "^\\.[a-zA-Z0-9]+$"
              },
              description: "File extensions for this language"
            },
            config_files: {
              type: "array",
              items: { type: "string" },
              description: "Configuration files to detect"
            }
          }
        }
      }
    },
    framework_servers: {
      type: "object",
      patternProperties: {
        "^[a-z]+$": {
          type: "object",
          required: ["server", "detect_files"],
          properties: {
            server: {
              type: "string",
              description: "Framework-specific server"
            },
            args: {
              type: "array",
              items: { type: "string" },
              description: "Arguments for the framework server"
            },
            detect_files: {
              type: "array",
              items: { type: "string" },
              description: "Files that indicate this framework"
            },
            detect_patterns: {
              type: "array",
              items: { type: "string" },
              description: "Patterns to detect in package files"
            }
          }
        }
      }
    },
    platform_overrides: {
      type: "object",
      patternProperties: {
        "^(windows|darwin|linux)$": {
          type: "object",
          properties: {
            global_settings: {
              type: "object",
              description: "Platform-specific global settings"
            },
            servers: {
              type: "object",
              description: "Platform-specific server overrides"
            }
          }
        }
      }
    },
    metadata: {
      type: "object",
      properties: {
        created: {
          type: "string",
          format: "date-time",
          description: "Creation timestamp"
        },
        updated: {
          type: "string",
          format: "date-time",
          description: "Last update timestamp"
        },
        author: {
          type: "string",
          description: "Configuration author"
        },
        license: {
          type: "string",
          description: "License"
        },
        project_scope: {
          type: "boolean",
          description: "Whether this is project-scoped"
        }
      }
    }
  }
};
// src/schemas/skill-config.json
var skill_config_default = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://agentskills.io/schema/skill-config.json",
  title: "Agent Skill Configuration",
  description: "Schema for SKILL.md frontmatter validation based on Agent Skills standard (https://agentskills.io/specification)",
  type: "object",
  required: ["name", "description"],
  additionalProperties: false,
  properties: {
    name: {
      type: "string",
      description: "Unique identifier for the skill (1-64 characters, lowercase alphanumeric + hyphens)",
      minLength: 1,
      maxLength: 64,
      pattern: "^[a-z0-9]+(-[a-z0-9]+)*$",
      errorMessage: {
        pattern: "Name must be lowercase alphanumeric with hyphens only, no consecutive hyphens, no leading/trailing hyphens"
      }
    },
    description: {
      type: "string",
      description: "Description of what the skill does and when to use it (1-1024 characters)",
      minLength: 1,
      maxLength: 1024
    },
    license: {
      type: "string",
      description: "License name or reference (e.g., 'MIT', 'Apache-2.0', 'Proprietary')",
      maxLength: 256
    },
    compatibility: {
      type: "string",
      description: "Environment requirements or compatibility information (1-500 characters)",
      minLength: 1,
      maxLength: 500
    },
    metadata: {
      type: "object",
      description: "Custom metadata as key-value string pairs",
      additionalProperties: {
        type: "string"
      }
    },
    "allowed-tools": {
      type: "string",
      description: "Space-delimited list of pre-approved tools (experimental)",
      pattern: "^[A-Za-z0-9_]+(\\([^)]*\\))?( [A-Za-z0-9_]+(\\([^)]*\\))?)*$"
    }
  }
};
export {
  validateAgentConfig,
  skill_config_default as skillConfigSchema,
  mcp_servers_default as mcpServersSchema,
  mcp_schemas_default as mcpSchemas,
  createAgentPrimitive
};
