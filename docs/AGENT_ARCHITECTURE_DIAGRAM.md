# Enhanced Agent Architecture Diagram

This document contains the Mermaid diagram for the enhanced agent architecture.

## Architecture Overview

```mermaid
graph TB
    %% Executive Level
    CA[cody-admin<br/>System Administrator<br/>Flight Director]

    %% Management Level
    CVM[cody-version-manager<br/>Scope & Planning<br/>Mission Planning]
    CRM[cody-release-manager<br/>Release Operations<br/>Release Director]

    %% Specialized Subagents
    CB[cody-builder<br/>Integration & Implementation<br/>Vehicle Engineering]
    QA[qa-subagent<br/>Quality Assurance<br/>Quality Control]
    SEC[security-subagent<br/>Security Assurance<br/>Safety Officer]
    TW[technical-writer<br/>Documentation<br/>Documentation Specialist]

    %% Delegation Relationships
    CA -->|delegates release operations| CRM
    CA -->|delegates security validation| SEC
    CA -->|final authority| CRM
    CA -->|final authority| SEC

    CVM -->|scope definition| CB
    CVM -->|feature allocation| CRM

    CRM -->|delegates quality validation| QA
    CRM -->|coordinates security validation| SEC
    CRM -->|reports to| CA

    CB -->|delegates documentation| TW
    CB -->|quality consultation| QA
    CB -->|security consultation| SEC

    QA -->|reports to| CRM
    QA -->|consults to| CB
    QA -->|consults to| CVM

    SEC -->|reports to| CA
    SEC -->|consults to| CRM
    SEC -->|consults to| CB
    SEC -->|consults to| CVM

    TW -->|reports to| CB

    %% Styling
    classDef executive fill:#d32f2f,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef management fill:#1976d2,stroke:#ffffff,stroke-width:2px,color:#ffffff
    classDef specialized fill:#388e3c,stroke:#ffffff,stroke-width:2px,color:#ffffff

    class CA executive
    class CVM,CRM management
    class CB,QA,SEC,TW specialized
```

## Release Process Flow

```mermaid
sequenceDiagram
    participant VM as cody-version-manager
    participant B as cody-builder
    participant QA as qa-subagent
    participant SEC as security-subagent
    participant RM as cody-release-manager
    participant ADMIN as cody-admin

    VM->>B: Allocate features to version
    B->>B: Implement features
    B->>QA: Request quality validation
    QA->>QA: Execute tests and quality checks
    QA->>RM: Quality validation complete
    
    B->>SEC: Request security validation
    SEC->>SEC: Perform security scans
    SEC->>RM: Security validation complete
    
    RM->>RM: Validate release readiness
    RM->>ADMIN: Request deployment approval
    ADMIN->>ADMIN: Final safety and operational check
    ADMIN->>RM: Deployment approved
    RM->>RM: Orchestrate deployment
```

## Delegation Pattern Matrix

```mermaid
graph LR
    subgraph "Executive"
        ADMIN[cody-admin]
    end
    
    subgraph "Management"
        VM[cody-version-manager]
        RM[cody-release-manager]
    end
    
    subgraph "Specialized"
        B[cody-builder]
        QA[qa-subagent]
        SEC[security-subagent]
        TW[technical-writer]
    end
    
    ADMIN -.->|delegates| RM
    ADMIN -.->|delegates| SEC
    RM -.->|delegates| QA
    B -.->|delegates| TW
    VM -.->|allocates| B
    VM -.->|coordinates| RM
    
    style ADMIN fill:#d32f2f,color:#ffffff
    style VM fill:#1976d2,color:#ffffff
    style RM fill:#1976d2,color:#ffffff
    style B fill:#388e3c,color:#ffffff
    style QA fill:#388e3c,color:#ffffff
    style SEC fill:#388e3c,color:#ffffff
    style TW fill:#388e3c,color:#ffffff
```

## Usage

To use these diagrams:

1. **View in Markdown**: Compatible with most Markdown viewers that support Mermaid
2. **Export**: Use MCP Mermaid server to export to PNG/SVG
3. **Edit**: Modify the Mermaid syntax to update the architecture
4. **Integration**: Include in documentation and presentations

The diagrams provide a visual representation of the enhanced agent architecture, showing clear delegation patterns and authority flows.