---
command: ":cody build"
description: Starts the BUILD phase and creates the feature backlog.
---

- **AGENT** show the **USER** the following first: 

```
+---------------+
Build Phase Start
+---------------+
```

### CREATE FEATURE BACKLOG 
Check that {{cfTemplates}}/build/feature-backlog.md does not exist.  

If it does not exist:

- Copy from {{cfTemplates}}/build/feature-backlog.md into {{cfWorkPhase}}
- Review the `plan.md` document you created in the discovery phase, then generate and update the `feature-backlog.md` document.
- When you are done, tell the **USER** to review it.  Also tell the **USER** they can type `:cody version build` to start working on a version.
- Stop here.

If it does exist:

- Tell the **USER** that the build phase has already started and the Feature Backlog exists.
- Scan the feature-backlog.md for the first version with "🔴 Not Started" status.
- If a Not Started version is found:
  - Tell the **USER** you found the next incomplete version: [version name].
  - Automatically execute `:cody version build [version name]` to start working on that version.
- If no Not Started versions are found:
  - Tell the **USER** that all versions are completed and they can use `:cody version add` to create new versions.
- Stop here.