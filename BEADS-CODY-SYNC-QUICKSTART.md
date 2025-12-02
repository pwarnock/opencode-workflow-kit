# Beads-Cody Automated Sync - Quick Start

## What This Does
- **Automatically** keeps Beads and Cody tasklists in sync
- **Prevents** commits when systems are out of sync
- **Auto-commits** sync changes to maintain consistency
- **Monitors** sync health and alerts on failures

## How It Works
1. **Pre-commit**: Syncs Cody before allowing commits
2. **Post-commit**: Syncs after Beads changes are committed
3. **CI/CD**: Ensures sync consistency in pull requests
4. **Monitoring**: Alerts if sync fails or becomes stale

## What You Need to Do
### Normal Workflow (No Changes Required)
```bash
# Work as usual - sync happens automatically
bd create "New task" -t feature -p 1
git add . && git commit -m "Add new task"
# Sync runs automatically before/after commit
```

### Manual Sync (If Needed)
```bash
# Force sync anytime
python3 scripts/automated-sync.py --force

# Check sync health
python3 scripts/sync-monitor.py

# View sync logs
tail -f .beads-cody-sync.log
```

## Troubleshooting
### Sync fails before commit
- Check: `python3 scripts/sync-monitor.py`
- Fix issues, then: `git commit --amend` to include sync changes

### Need to bypass sync (emergency)
```bash
git commit --no-verify -m "emergency commit - bypass sync"
# Remember to run: python3 scripts/automated-sync.py --force
```

### Sync seems stuck
- Remove lock: `rm .beads-cody-sync.lock`
- Run: `python3 scripts/automated-sync.py --force`

## Files Created
- `scripts/automated-sync.py` - Main sync engine
- `.git/hooks/pre-commit-sync` - Pre-commit hook
- `.git/hooks/post-commit-sync` - Post-commit hook
- `.github/workflows/beads-cody-sync.yml` - CI/CD integration
- `scripts/sync-monitor.py` - Health monitoring
- `.beads-cody-sync.log` - Sync activity log
- `.beads-cody-sync-state.json` - Sync state tracking

## Support
- Issues: Check `.beads-cody-sync.log` for errors
- Health: Run `python3 scripts/sync-monitor.py`
- Force sync: `python3 scripts/automated-sync.py --force`
