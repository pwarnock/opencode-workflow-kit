# Anticipatory Testing Strategy for External System Integration

## Purpose

This document defines a **strategic testing approach** for maintaining loose coupling integration between opencode-workflow-kit and external systems (Cody PBT, Beads/bd). 

**Core Problem**: Both Cody PBT and Beads are immature projects that update frequently, creating high risk of **silent breakage** in our integration layer.

**Solution**: **Anticipatory Testing** - proactive detection of integration breakage before it impacts users.

## Design Principles

### 1. Fail Loud, Never Silent
- Every integration failure must be immediately visible
- No graceful degradation that hides problems
- Clear error messages with actionable fixes

### 2. Contract-Based Testing
- Define explicit contracts with external systems
- Test contracts continuously
- Detect contract violations immediately

### 3. Version Compatibility Matrix
- Test across multiple versions of external systems
- Maintain compatibility baseline
- Anticipate breaking changes

### 4. Non-Blocking Integration
- Integration failures never block git operations
- Graceful degradation with clear warnings
- Preserve all native functionality

## External System Contracts

### Beads (bd) Contract

#### Command Interface Contract
```bash
# Expected commands that must exist:
bd --version          # Returns version string
bd create              # Creates issues with JSON output
bd sync                 # Synchronizes JSONL files
bd hooks list          # Lists installed hooks
bd update               # Updates issue status

# Expected flags:
--json                 # JSON output format
--status               # Status field for updates
--dependencies          # Dependency management
```

#### Data Format Contract
```json
// Expected JSONL structure:
{
  "id": "string",
  "title": "string", 
  "description": "string",
  "status": "open|in_progress|closed",
  "priority": 0|1|2|3|4,
  "issue_type": "bug|feature|task|epic|chore",
  "created_at": "ISO8601",
  "updated_at": "ISO8601",
  "dependencies": ["issue_id"]
}
```

#### Hook Behavior Contract
```bash
# Expected bd hooks behavior:
pre-commit:    # Flushes changes to JSONL, never blocks commits
post-merge:    # Imports JSONL changes, never blocks merges  
post-checkout:  # Imports JSONL for branch switches, never blocks checkouts
pre-push:       # Validates JSONL is committed, may block pushes with clear error
```

### Cody PBT Contract

#### Directory Structure Contract
```
.cody/
├── config/
│   ├── commands/          # Agent command definitions
│   └── agents/           # Agent configurations
├── project/
│   ├── build/
│   │   └── feature-backlog.md    # Task list in markdown table format
│   └── plan/              # Project planning documents
└── project-config.json       # Project configuration
```

#### Feature Backlog Contract
```markdown
# Expected feature-backlog.md structure:
## Backlog
| ID | Feature | Description | Priority | Status |
|-----|---------|-------------|----------|--------|
| owk-1 | Feature name | Description | High | 🟢 |
```

#### Agent Configuration Contract
```json
// Expected agent config structure:
{
  "name": "string",
  "description": "string", 
  "model": "string",
  "permissions": ["tool1", "tool2"],
  "tools": {
    "tool_name": {
      "description": "string",
      "parameters": {}
    }
  }
}
```

## Testing Layers

### Layer 1: Contract Validation Tests

**Purpose**: Verify external systems follow expected contracts

**Test Scenarios**:
```python
class TestExternalSystemContracts:
    def test_beads_command_contract(self):
        """Verify bd commands follow contract"""
        # Test bd --version returns expected format
        # Test bd create accepts expected parameters
        # Test bd sync handles expected flags
        
    def test_beads_data_format_contract(self):
        """Verify Beads JSONL follows contract"""
        # Parse sample JSONL files
        # Validate required fields exist
        # Validate data types and formats
        
    def test_cody_structure_contract(self):
        """Verify Cody PBT follows structure contract"""
        # Check .cody/ directory structure
        # Validate feature-backlog.md format
        # Validate agent configuration schemas
        
    def test_cody_data_contract(self):
        """Verify Cody data follows contract"""
        # Parse feature-backlog.md
        # Validate table structure
        # Check ID formats and status values
```

### Layer 2: Version Compatibility Tests

**Purpose**: Ensure integration works across different versions

**Test Matrix**:
```python
class TestVersionCompatibility:
    def test_beads_version_matrix(self):
        """Test across bd versions"""
        versions = ["0.26.0", "0.27.0", "0.27.2", "0.28.0"]
        for version in versions:
            with self.mock_beads_version(version):
                self.test_integration_with_version(version)
                
    def test_cody_evolution_scenarios(self):
        """Test Cody structure evolution"""
        scenarios = [
            "current_structure",      # Today's structure
            "missing_commands",       # Commands dir missing
            "alternative_format",      # Different backlog format
            "deprecated_fields",      # Old field names
        ]
        for scenario in scenarios:
            with self.mock_cody_scenario(scenario):
                self.test_integration_resilience(scenario)
```

### Layer 3: Silent Failure Detection Tests

**Purpose**: Ensure no integration failures go unnoticed

**Failure Scenarios**:
```python
class TestSilentFailureDetection:
    def test_missing_beads_command(self):
        """When bd command missing, should fail loudly"""
        # Remove bd from PATH
        # Run integration
        # Verify clear error message
        # Verify graceful degradation
        
    def test_beads_command_failure(self):
        """When bd command fails, should detect and report"""
        # Mock bd command to return error
        # Run integration
        # Verify error is caught and logged
        # Verify clear user notification
        
    def test_cody_structure_missing(self):
        """When Cody structure missing, should detect and report"""
        # Remove .cody/ directory
        # Run integration
        # Verify detection and clear reporting
        
    def test_git_operation_failures(self):
        """When git operations fail, should not block"""
        # Mock git failures
        # Run hooks
        # Verify operations continue
        # Verify error logging
```

### Layer 4: Integration Resilience Tests

**Purpose**: Test system resilience to external changes

**Resilience Scenarios**:
```python
class TestIntegrationResilience:
    def test_hook_chain_integrity(self):
        """Test hook chains survive external modifications"""
        # Simulate bd hook updates
        # Verify our integration still works
        # Test hook chain execution order
        
    def test_partial_system_availability(self):
        """Test with only one system available"""
        test_cases = [
            ("bd_available", "cody_missing"),
            ("cody_available", "bd_missing"), 
            ("both_available", "control"),
            ("both_missing", "degradation"),
        ]
        for case_name, scenario in test_cases:
            with self.mock_system_availability(scenario):
                self.test_integration_scenario(case_name)
                
    def test_concurrent_operations(self):
        """Test concurrent git operations"""
        # Simulate parallel commits
        # Test lock management
        # Verify data integrity
        
    def test_timeout_scenarios(self):
        """Test timeout handling"""
        # Mock slow external commands
        # Verify timeout handling
        # Test graceful degradation
```

## Implementation Strategy

### Phase 1: Foundation (Week 1)

#### 1.1 Contract Definition
- [ ] Document external system contracts
- [ ] Create contract validation tests
- [ ] Test current contracts thoroughly

#### 1.2 Silent Failure Detection
- [ ] Implement loud failure logging
- [ ] Test all failure scenarios
- [ ] Ensure no silent failures

#### 1.3 Test Infrastructure
- [ ] Build isolated test environments
- [ ] Add version mocking capabilities
- [ ] Create automated test runner

### Phase 2: Anticipatory Testing (Week 2)

#### 2.1 Version Compatibility Matrix
- [ ] Test across multiple bd versions
- [ ] Test Cody structure evolution scenarios
- [ ] Create compatibility baseline

#### 2.2 Integration Resilience Testing
- [ ] Hook chain integrity tests
- [ ] Partial system availability tests
- [ ] Concurrent operation tests

#### 2.3 Continuous Monitoring
- [ ] Add health check system
- [ ] Create breakage detection alerts
- [ ] Implement automated regression testing

### Phase 3: Advanced Resilience (Week 3)

#### 3.1 External Change Simulation
- [ ] Mock breaking changes in bd
- [ ] Simulate Cody structure changes
- [ ] Test adaptation strategies

#### 3.2 Performance and Reliability
- [ ] Load testing under stress
- [ ] Timeout and deadlock prevention
- [ ] Resource cleanup verification

## Success Metrics

### Critical Success Indicators
- **Zero Silent Failures**: All failures detected and reported within 1 operation
- **100% Hook Preservation**: bd hooks never interfered with or broken
- **Graceful Degradation**: System works with any subset of external systems
- **Fast Failure Detection**: Breakages detected within 1 commit cycle
- **Clear Recovery Paths**: Every failure has documented fix with <5 steps

### Monitoring and Alerting
```python
# Health check system
class IntegrationHealthMonitor:
    def check_external_system_health(self):
        """Check health of external systems"""
        return {
            "beads": {
                "available": self.check_beads_available(),
                "version": self.get_beads_version(),
                "contract_compliant": self.validate_beads_contract(),
            },
            "cody": {
                "available": self.check_cody_available(),
                "structure_valid": self.validate_cody_structure(),
                "contract_compliant": self.validate_cody_contract(),
            },
            "integration": {
                "hooks_working": self.test_hook_chains(),
                "sync_functional": self.test_sync_operations(),
                "last_check": datetime.now().isoformat(),
            }
        }
        
    def generate_breakage_alert(self, system, issue):
        """Generate immediate breakage alert"""
        alert = {
            "timestamp": datetime.now().isoformat(),
            "system": system,
            "issue": issue,
            "severity": "critical",
            "impact": "Integration may fail silently",
            "immediate_action": "Run: python3 scripts/test-integration-contracts.py",
            "investigation_steps": self.get_investigation_steps(system, issue),
        }
        self.send_alert(alert)
```

## Integration with Existing Testing

### Current Test Coverage
Based on analysis of existing test infrastructure:

**Existing Strengths**:
- Comprehensive test scripts (17+ test files)
- Multiple testing levels (unit, integration, system)
- Cross-platform compatibility testing
- Mock-based testing for isolation

**Critical Gaps for Anticipatory Testing**:
- No external system contract validation
- No version compatibility matrix testing
- No silent failure detection mechanisms
- No integration resilience testing

### Integration Plan
1. **Extend `scripts/test-git-hooks.py`** - Add anticipatory scenarios
2. **Create `scripts/test-integration-contracts.py`** - Contract validation tests
3. **Enhance `scripts/test-runner.py`** - Add version matrix testing
4. **Update `docs/TESTING.md`** - Add anticipatory testing procedures

## File Structure

```
scripts/
├── test-integration-contracts.py     # NEW: Contract validation tests
├── test-version-compatibility.py       # NEW: Version matrix testing  
├── test-silent-failures.py          # NEW: Silent failure detection
├── test-integration-resilience.py    # NEW: Resilience testing
├── integration-health-monitor.py       # NEW: Health monitoring
└── test-anticipatory-suite.py        # NEW: Unified test runner

docs/
├── INTEGRATION-TESTING.md           # NEW: This document
├── TESTING.md                       # UPDATE: Add anticipatory section
└── EXTERNAL-SYSTEM-CONTRACTS.md   # NEW: Contract definitions
```

## Next Steps

1. **Immediate**: Create contract validation tests
2. **Week 1**: Implement silent failure detection
3. **Week 2**: Build version compatibility matrix
4. **Week 3**: Add resilience testing
5. **Ongoing**: Continuous monitoring and alerts

## Related Issues

- **owk-49**: "Re-enable and stabilize git hooks" (CURRENT TASK)
- **owk-2vt**: "Fix integration tests to run and pass" (IN PROGRESS)
- **owk-dvg**: "Create comprehensive integration test suite" (NOT STARTED)
- **owk-5jx**: "Implement comprehensive unit test suite" (COMPLETED)

This anticipatory testing strategy ensures that as bd and Cody PBT evolve, breakages are caught immediately and dealt with explicitly rather than silently degrading functionality.