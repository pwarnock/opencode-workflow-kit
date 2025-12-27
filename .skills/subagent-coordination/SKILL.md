---
name: subagent-coordination
description: Multi-agent coordination patterns for delegating work between specialized agents, managing agent roles, and orchestrating workflows across multiple AI agents.
license: MIT
metadata:
  author: liaison-toolkit
  version: "1.0"
  keywords: "agents, coordination, delegation, orchestration, workflows, multi-agent"
---

# Subagent Coordination

Patterns for coordinating work across multiple specialized AI agents, managing agent roles and responsibilities, and orchestrating delegated workflows.

## When to use this skill

Use this skill when:
- Determining which agent should handle a specific task
- Delegating work between specialized agents
- Designing multi-agent workflows
- Managing agent capability discovery
- Handling agent handoffs and escalation
- Orchestrating complex tasks across agents

## Agent Roles and Boundaries

### Core Agent Types

From `agents/` directory structure:

```typescript
// Primary agents (initiative)
cody-admin.json      → Project coordination, planning, infrastructure
cody-builder.json    → Build processes, compilation, deployment

// Specialized agents (reactive)
cody-general.json     → General assistance, undefined tasks
cody-planner.json     → Task breakdown, dependency analysis
cody-release-manager → Release management, versioning, publishing
qa-subagent.json       → Quality assurance, testing, validation
security-subagent.json  → Security audits, vulnerability scanning
frontend-specialist   → Frontend development (React, Vue, etc.)
```

### Role Responsibility Matrix

| Agent | Primary Role | Delegates To | Avoids |
|--------|--------------|--------------|----------|
| cody-admin | Infrastructure, planning | All agents | None |
| cody-planner | Task breakdown | cody-general | Direct implementation |
| qa-subagent | Testing | All | None |
| security-subagent | Security audits | All | None |
| frontend-specialist | UI/components | cody-general | Backend logic |
| cody-builder | Build/deploy | cody-admin | Development tasks |

### Capabilities by Agent

```typescript
// Agent capability mapping
const AGENT_CAPABILITIES = {
  'cody-admin': [
    'task-management',
    'agent-orchestration',
    'build-automation'
  ],
  'cody-planner': [
    'task-decomposition',
    'dependency-analysis',
    'planning'
  ],
  'qa-subagent': [
    'testing-strategy',
    'test-execution',
    'quality-gate-enforcement'
  ],
  'security-subagent': [
    'vulnerability-scanning',
    'security-audit',
    'compliance-validation'
  ],
  'frontend-specialist': [
    'component-creation',
    'styling',
    'ui-testing'
  ]
};
```

## Delegation Patterns

### Capability-Based Routing

```typescript
function findBestAgent(task: Task): string {
  const taskType = inferTaskType(task);

  // Map task types to agents
  const agentMapping: Record<string, string> = {
    'testing': 'qa-subagent',
    'security': 'security-subagent',
    'frontend': 'frontend-specialist',
    'release': 'cody-release-manager',
    'planning': 'cody-planner',
    'infrastructure': 'cody-admin',
    'general': 'cody-general'
  };

  return agentMapping[taskType] || 'cody-general';
}

// Usage
const agent = findBestAgent({ type: 'security-audit' });
console.log(`Delegating to: ${agent}`);
await delegateToAgent(agent, task);
```

### Sequential Delegation

```typescript
async function executeMultiAgentWorkflow(workflow: Workflow): Promise<void> {
  const steps = workflow.steps;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const agent = findBestAgent(step);

    console.log(`Step ${i + 1}/${steps.length}: ${step.name} → ${agent}`);

    const result = await delegateToAgent(agent, step);

    if (!result.success) {
      console.error(`Agent ${agent} failed at step ${i + 1}`);
      await escalateFailure(step, result);
      break;
    }

    // Pass results to next step
    workflow.context[step.name] = result;
  }
}
```

### Parallel Delegation

```typescript
async function executeParallelTasks(tasks: Task[]): Promise<TaskResult[]> {
  // Group tasks by agent type
  const agentTasks: Record<string, Task[]> = {};

  for (const task of tasks) {
    const agent = findBestAgent(task);
    agentTasks[agent] = agentTasks[agent] || [];
    agentTasks[agent].push(task);
  }

  // Execute each agent's tasks in parallel
  const results = await Promise.all(
    Object.entries(agentTasks).map(([agent, tasks]) =>
      executeAgentBatch(agent, tasks)
    )
  );

  return results.flat();
}
```

## Agent Handoff Procedures

### Context Passing

```typescript
interface AgentHandoff {
  fromAgent: string;
  toAgent: string;
  context: {
    task: string;
    results: any;
    decisions: string[];
    partialState?: any;
  };
}

function handoffAgent(handoff: AgentHandoff): Promise<void> {
  console.log(`Handoff: ${handoff.fromAgent} → ${handoff.toAgent}`);

  // Transfer context to next agent
  const newAgent = loadAgent(handoff.toAgent);
  await newAgent.initialize(handoff.context);

  // Clear previous agent state
  const previousAgent = loadAgent(handoff.fromAgent);
  await previousAgent.cleanup();
}
```

### Handoff Templates

```typescript
// From cody-planner to qa-subagent
const handoffToQA = {
  fromAgent: 'cody-planner',
  toAgent: 'qa-subagent',
  context: {
    task: 'Validate implementation',
    results: {
      implementationFiles: ['src/command.ts', 'src/utils.ts'],
      decisions: ['Used Bun test runner', 'Implemented with 80% coverage']
    },
    taskBreakdown: {
      'unit-tests': 'cody-general',
      'integration-tests': 'qa-subagent',
      'e2e-tests': 'qa-subagent'
    }
  };
}
```

## Error Escalation

### Failure Detection

```typescript
async function delegateWithRetry(agent: string, task: Task, maxRetries = 3): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await executeAgentTask(agent, task);
      return result;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Agent ${agent} attempt ${attempt} failed: ${error.message}`);

      if (attempt < maxRetries) {
        await sleep(2000 * attempt); // Exponential backoff
      }
    }
  }

  // All retries exhausted - escalate
  return await escalateFailure(agent, task, lastError);
}
```

### Escalation Paths

```typescript
// Agent → More specialized agent
const escalationPath = {
  'cody-general': 'qa-subagent',
  'cody-planner': 'cody-admin',
  'frontend-specialist': 'security-subagent',
  'qa-subagent': 'cody-admin',
  'security-subagent': 'cody-admin'
};

function escalateToSupervisor(failedAgent: string, error: Error): Promise<void> {
  const supervisor = escalationPath[failedAgent];

  console.error(`Escalating from ${failedAgent} to ${supervisor}`);

  await notifySupervisor(supervisor, {
    agent: failedAgent,
    error: error.message,
    timestamp: new Date()
  });
}
```

## Workflow Orchestration

### Agent Graph Definition

```typescript
interface AgentNode {
  id: string;
  agent: string;
  dependencies: string[];
  outputDependencies: string[];
}

const WORKFLOW_GRAPH: AgentNode[] = [
  {
    id: 'plan',
    agent: 'cody-planner',
    dependencies: [],
    outputDependencies: ['implement']
  },
  {
    id: 'implement',
    agent: 'cody-general',
    dependencies: ['plan'],
    outputDependencies: ['test']
  },
  {
    id: 'test',
    agent: 'qa-subagent',
    dependencies: ['implement'],
    outputDependencies: ['deploy']
  },
  {
    id: 'deploy',
    agent: 'cody-builder',
    dependencies: ['test'],
    outputDependencies: []
  }
];

function executeWorkflow(graph: AgentNode[]): Promise<void> {
  const executionOrder = topologicalSort(graph);

  for (const node of executionOrder) {
    const agent = loadAgent(node.agent);
    console.log(`Executing ${node.id} with ${node.agent}`);

    // Wait for dependencies
    await waitForDependencies(node.dependencies);

    // Execute
    const result = await agent.execute(node);

    // Notify dependent agents
    notifyDependencies(node.outputDependencies, result);
  }
}
```

### Orchestration with Liaison

```bash
# Create workflow in liaison
liaison workflow create "multi-agent-release" \
  --trigger "agent:delegated:agent=cody-planner" \
  --actions "delegate-to-general,notify-builder" \
  --condition "all-dependencies-met"

# Trigger workflow
liaison task create "Prepare release" --auto-trigger "multi-agent-release"
```

## Inter-Agent Communication

### Message Format

```typescript
interface AgentMessage {
  from: string;
  to: string;
  type: 'task' | 'result' | 'error' | 'status';
  payload: any;
  timestamp: Date;
  correlationId: string;
}

async function sendAgentMessage(message: AgentMessage): Promise<void> {
  await messageBus.publish({
    topic: `agent.${message.to}`,
    message,
    headers: {
      'X-Agent-From': message.from,
      'X-Correlation-ID': message.correlationId
    }
  });
}
```

### Status Broadcasting

```typescript
// Agent status updates
async function broadcastStatus(agent: string, status: 'working' | 'idle' | 'error'): Promise<void> {
  await messageBus.publish({
    topic: 'agent.status',
    message: { agent, status, timestamp: new Date() }
  });
}

// Subscribe to agent status
function subscribeToAgentStatus(callback: (status: AgentStatus) => void): void {
  messageBus.subscribe('agent.status', callback);
}
```

## Agent Discovery

### Capability Registration

```typescript
// Agents register their capabilities
interface AgentCapabilities {
  agent: string;
  capabilities: string[];
  maxConcurrency: number;
  supportedTaskTypes: string[];
}

// cody-admin registers agents
await liaison.registerAgent({
  agent: 'qa-subagent',
  capabilities: ['testing', 'validation', 'quality-gates'],
  maxConcurrency: 1,
  supportedTaskTypes: ['testing', 'validation']
});
```

### Finding Agents

```bash
# List available agents
liaison agent list

# Find agent by capability
liaison agent find --capability testing

# Check agent status
liaison agent status qa-subagent
```

## Verification

After implementing agent coordination:
- [ ] Agent roles and responsibilities clearly defined
- [ ] Delegation logic routes tasks to appropriate agents
- [ ] Handoff procedures transfer context between agents
- [ ] Escalation paths are defined for failures
- [ ] Inter-agent communication is standardized
- [ ] Workflow graphs are validated for cycles
- [ ] Agent capabilities are registered and discoverable
- [ ] Parallel delegation doesn't exceed agent concurrency
- [ ] Error handling includes retry and escalation

## Examples from liaison-toolkit

### Example 1: Multi-Agent Release

```bash
# 1. cody-planner breaks down release task
liaison task create "Prepare release" --auto-trigger planning

# 2. cody-general implements changes
liaison task create "Implement version bump" --assign cody-general

# 3. qa-subagent validates
liaison task create "Run tests" --assign qa-subagent

# 4. security-subagent scans
liaison task create "Security audit" --assign security-subagent

# 5. cody-builder deploys
liaison task create "Build and publish" --assign cody-builder
```

### Example 2: Error Escalation

```typescript
// cody-planner delegates to cody-general
const result = await delegateToAgent('cody-general', task);

if (!result.success) {
  // Escalate to cody-admin
  console.error('General agent failed, escalating to admin...');

  await escalateToAdmin({
    originalAgent: 'cody-general',
    task,
    error: result.error
  });
}
```

### Example 3: Capability Discovery

```typescript
// Find agent for security task
const agent = liaison.findAgent({
  capabilities: ['security-audit', 'vulnerability-scanning']
});

// Returns: 'security-subagent'
console.log(`Delegating security task to: ${agent}`);
await executeAgent(agent, task);
```

## Related Resources

- [Multi-Agent Systems](https://en.wikipedia.org/wiki/Multi-agent_system)
- [Agent Orchestration Patterns](https://www.baeldung.com/cs/multi-agent-patterns/)
- [Task Delegation](https://en.wikipedia.org/wiki/Task_delegation)
- [Service Discovery](https://en.wikipedia.org/wiki/Service_discovery)
