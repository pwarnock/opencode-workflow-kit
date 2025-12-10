import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import fs from "fs-extra";
import path from "path";
import {
  JSONConfigLoader,
  YAMLConfigLoader,
  EnvConfigLoader,
  ConfigLoaderFactory,
} from "../../../src/config/ConfigLoader";
import { CodyBeadsConfig } from "../../../src/types";

describe("ConfigLoader", () => {
  const testDir = path.join(__dirname, "..", "..", "..", ".test-config");
  const jsonConfigPath = path.join(testDir, "test.config.json");
  const yamlConfigPath = path.join(testDir, "test.config.yaml");

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe("JSONConfigLoader", () => {
    it("should load valid JSON configuration", async () => {
      const config: CodyBeadsConfig = {
        version: "1.0.0",
        github: {
          owner: "test-owner",
          repo: "test-repo",
          token: "test-token",
          apiUrl: "https://api.github.com",
        },
        cody: {
          projectId: "test-project",
          apiUrl: "https://api.cody.ai",
        },
        beads: {
          projectPath: "./.beads",
          configPath: ".beads/beads.json",
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual",
          includeLabels: ["bug", "feature"],
          excludeLabels: ["wontfix"],
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
        templates: {
          defaultTemplate: "minimal",
          templatePath: "./templates",
        },
      };

      await fs.writeFile(jsonConfigPath, JSON.stringify(config, null, 2));

      const loader = new JSONConfigLoader(jsonConfigPath);
      const loadedConfig = await loader.load();

      expect(loadedConfig).toEqual(config);
    });

    it("should return default configuration when file doesn't exist", async () => {
      const loader = new JSONConfigLoader("nonexistent.json");
      const config = await loader.load();

      expect(config).toBeDefined();
      expect(config.version).toBe("1.0.0");
      expect(config.github).toBeDefined();
    });

    it("should validate configuration", async () => {
      const loader = new JSONConfigLoader();
      const invalidConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "", repo: "", token: "" },
      };

      const validation = loader.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("GitHub owner is required");
    });

    it("should get source type", () => {
      const loader = new JSONConfigLoader();
      expect(loader.getSourceType()).toBe("json");
    });

    it("should check if source exists", async () => {
      const loader = new JSONConfigLoader(jsonConfigPath);
      expect(await loader.sourceExists()).toBe(false); // File doesn't exist yet

      await fs.writeFile(jsonConfigPath, "{}");
      expect(await loader.sourceExists()).toBe(true);
    });

    it("should get debug info", async () => {
      const validConfig = {
        version: "1.0.0",
        github: { owner: "test", repo: "test", token: "test" },
        cody: { projectId: "test" },
        beads: { projectPath: "./.beads" },
        sync: { defaultDirection: "bidirectional" },
        templates: { defaultTemplate: "minimal", templatePath: "./templates" },
      };
      await fs.writeFile(jsonConfigPath, JSON.stringify(validConfig));
      const loader = new JSONConfigLoader(jsonConfigPath);
      await loader.load();

      const debugInfo = loader.getDebugInfo();
      expect(debugInfo.sourceType).toBe("json");
      expect(debugInfo.sourcePath).toBe(jsonConfigPath);
      expect(debugInfo.fileSize).toBeGreaterThan(0);
    });

    it("should handle errors gracefully", async () => {
      const loader = new JSONConfigLoader(jsonConfigPath);
      await fs.writeFile(jsonConfigPath, "invalid json");

      await expect(loader.load()).rejects.toThrow(
        "Failed to load JSON configuration",
      );
    });
  });

  describe("YAMLConfigLoader", () => {
    it("should load valid YAML configuration", async () => {
      const config: CodyBeadsConfig = {
        version: "1.0.0",
        github: {
          owner: "test-owner",
          repo: "test-repo",
          token: "test-token",
          apiUrl: "https://api.github.com",
        },
        cody: {
          projectId: "test-project",
          apiUrl: "https://api.cody.ai",
        },
        beads: {
          projectPath: "./.beads",
          configPath: ".beads/beads.json",
          autoSync: false,
          syncInterval: 60,
        },
        sync: {
          defaultDirection: "bidirectional",
          conflictResolution: "manual",
          includeLabels: ["bug", "feature"],
          excludeLabels: ["wontfix"],
          preserveComments: true,
          preserveLabels: true,
          syncMilestones: false,
        },
        templates: {
          defaultTemplate: "minimal",
          templatePath: "./templates",
        },
      };

      const yamlContent = `
version: "1.0.0"
github:
  owner: "test-owner"
  repo: "test-repo"
  token: "test-token"
  apiUrl: "https://api.github.com"
cody:
  projectId: "test-project"
  apiUrl: "https://api.cody.ai"
beads:
  projectPath: "./.beads"
  configPath: ".beads/beads.json"
  autoSync: false
  syncInterval: 60
sync:
  defaultDirection: "bidirectional"
  conflictResolution: "manual"
  includeLabels:
    - "bug"
    - "feature"
  excludeLabels:
    - "wontfix"
  preserveComments: true
  preserveLabels: true
  syncMilestones: false
templates:
  defaultTemplate: "minimal"
  templatePath: "./templates"
`;

      await fs.writeFile(yamlConfigPath, yamlContent);

      const loader = new YAMLConfigLoader(yamlConfigPath);
      const loadedConfig = await loader.load();

      expect(loadedConfig).toEqual(config);
    });

    it("should return default configuration when file doesn't exist", async () => {
      const loader = new YAMLConfigLoader("nonexistent.yaml");
      const config = await loader.load();

      expect(config).toBeDefined();
      expect(config.version).toBe("1.0.0");
    });

    it("should get source type", () => {
      const loader = new YAMLConfigLoader();
      expect(loader.getSourceType()).toBe("yaml");
    });

    it("should handle errors gracefully", async () => {
      const loader = new YAMLConfigLoader(yamlConfigPath);
      await fs.writeFile(yamlConfigPath, "invalid: yaml: content");

      await expect(loader.load()).rejects.toThrow(
        "Failed to load YAML configuration",
      );
    });
  });

  describe("EnvConfigLoader", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("should load configuration from environment variables", async () => {
      process.env.GITHUB_OWNER = "env-owner";
      process.env.GITHUB_REPO = "env-repo";
      process.env.GITHUB_TOKEN = "env-token";
      process.env.CODY_PROJECT_ID = "env-project";
      process.env.BEADS_PROJECT_PATH = "./env-beads";

      const loader = new EnvConfigLoader();
      const config = await loader.load();

      expect(config.github?.owner).toBe("env-owner");
      expect(config.github?.repo).toBe("env-repo");
      expect(config.github?.token).toBe("env-token");
      expect(config.cody?.projectId).toBe("env-project");
      expect(config.beads?.projectPath).toBe("./env-beads");
    });

    it("should use default values when env vars are missing", async () => {
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      delete process.env.GITHUB_TOKEN;

      const loader = new EnvConfigLoader();
      const config = await loader.load();

      expect(config.github?.owner).toBe("");
      expect(config.github?.repo).toBe("");
      expect(config.github?.token).toBe("");
      expect(config.github?.apiUrl).toBe("https://api.github.com");
    });

    it("should get source type", () => {
      const loader = new EnvConfigLoader();
      expect(loader.getSourceType()).toBe("env");
    });

    it("should always return true for sourceExists", async () => {
      const loader = new EnvConfigLoader();
      expect(await loader.sourceExists()).toBe(true);
    });

    it("should get debug info with env var count", async () => {
      process.env.GITHUB_OWNER = "test";
      process.env.CODY_PROJECT_ID = "test";

      const loader = new EnvConfigLoader();
      await loader.load();

      const debugInfo = loader.getDebugInfo();
      expect(debugInfo.sourceType).toBe("env");
      expect(debugInfo.envVarsDetected).toBeGreaterThan(0);
    });

    it("should handle validation errors", async () => {
      // Missing required fields
      process.env.GITHUB_OWNER = "";
      process.env.GITHUB_REPO = "";

      const loader = new EnvConfigLoader();
      const config = await loader.load();
      // Should return default config instead of throwing
      expect(config).toBeDefined();
      expect(config.version).toBe("1.0.0");
    });
  });

  describe("ConfigLoaderFactory", () => {
    it("should create JSON loader for .json files", () => {
      const loader = ConfigLoaderFactory.createLoader("test.json");
      expect(loader).toBeInstanceOf(JSONConfigLoader);
      expect(loader.getSourceType()).toBe("json");
    });

    it("should create YAML loader for .yaml files", () => {
      const loader = ConfigLoaderFactory.createLoader("test.yaml");
      expect(loader).toBeInstanceOf(YAMLConfigLoader);
      expect(loader.getSourceType()).toBe("yaml");
    });

    it("should create YAML loader for .yml files", () => {
      const loader = ConfigLoaderFactory.createLoader("test.yml");
      expect(loader).toBeInstanceOf(YAMLConfigLoader);
      expect(loader.getSourceType()).toBe("yaml");
    });

    it("should create JSON loader for unknown extensions", () => {
      const loader = ConfigLoaderFactory.createLoader("test.txt");
      expect(loader).toBeInstanceOf(JSONConfigLoader);
    });

    it("should create env loader when no path provided", () => {
      const loader = ConfigLoaderFactory.createLoader();
      expect(loader).toBeInstanceOf(EnvConfigLoader);
      expect(loader.getSourceType()).toBe("env");
    });

    it("should create specific loader instances", () => {
      const jsonLoader = ConfigLoaderFactory.createJSONLoader("test.json");
      expect(jsonLoader).toBeInstanceOf(JSONConfigLoader);

      const yamlLoader = ConfigLoaderFactory.createYAMLLoader("test.yaml");
      expect(yamlLoader).toBeInstanceOf(YAMLConfigLoader);

      const envLoader = ConfigLoaderFactory.createEnvLoader();
      expect(envLoader).toBeInstanceOf(EnvConfigLoader);
    });
  });

  describe("Configuration Validation", () => {
    it("should validate required fields", () => {
      const loader = new JSONConfigLoader();
      const invalidConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "", repo: "", token: "" },
      };

      const validation = loader.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain("GitHub owner is required");
      expect(validation.errors).toContain("GitHub repository is required");
    });

    it("should validate sync direction", () => {
      const loader = new JSONConfigLoader();
      const invalidConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "test", repo: "test", token: "test" },
        sync: { defaultDirection: "invalid-direction" },
      };

      const validation = loader.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Invalid sync direction: invalid-direction",
      );
    });

    it("should validate conflict resolution strategy", () => {
      const loader = new JSONConfigLoader();
      const invalidConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "test", repo: "test", token: "test" },
        sync: { conflictResolution: "invalid-strategy" },
      };

      const validation = loader.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Invalid conflict resolution strategy: invalid-strategy",
      );
    });

    it("should validate template configuration", () => {
      const loader = new JSONConfigLoader();
      const invalidConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "test", repo: "test", token: "test" },
        templates: { defaultTemplate: "custom" },
      };

      const validation = loader.validate(invalidConfig);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        "Template path is required when default template is specified",
      );
    });

    it("should pass validation for valid configuration", () => {
      const loader = new JSONConfigLoader();
      const validConfig: Partial<CodyBeadsConfig> = {
        github: { owner: "test", repo: "test", token: "test" },
        cody: { projectId: "test" },
        sync: { defaultDirection: "bidirectional" },
        templates: { defaultTemplate: "minimal", templatePath: "./templates" },
      };

      const validation = loader.validate(validConfig);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle file read errors gracefully", async () => {
      const loader = new JSONConfigLoader("/nonexistent/path/config.json");
      const config = await loader.load();
      // Should return default config instead of throwing
      expect(config).toBeDefined();
      expect(config.version).toBe("1.0.0");
    });

    it("should handle JSON parse errors gracefully", async () => {
      await fs.writeFile(jsonConfigPath, "invalid json content");
      const loader = new JSONConfigLoader(jsonConfigPath);
      await expect(loader.load()).rejects.toThrow(
        "Failed to load JSON configuration",
      );
    });

    it("should handle YAML parse errors gracefully", async () => {
      await fs.writeFile(yamlConfigPath, "invalid: yaml: content");
      const loader = new YAMLConfigLoader(yamlConfigPath);
      await expect(loader.load()).rejects.toThrow(
        "Failed to load YAML configuration",
      );
    });
  });
});
