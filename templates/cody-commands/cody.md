---
command: cody
description: "Execute :cody workflows by routing to specialized subagents"
---

@cody-$ARGUMENTS Execute :cody $ARGUMENTS workflow

Available workflows:
- plan: Execute :cody planning workflow (routes to cody-planner)
- build: Execute :cody build workflow (routes to cody-builder)  
- refresh: Execute :cody refresh workflow (routes to cody-admin)
- version-add: Add new version (routes to cody-version-manager)
- version-build: Build version (routes to cody-version-manager)

Usage: /cody [workflow]
Example: /cody plan

If no workflow is specified, this help message will be shown.