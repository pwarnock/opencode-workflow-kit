#!/usr/bin/env node

const fs = require('fs');

// Read files
const cleanupSummaryPath = '.cody/cleanup-summary.md';
const beadsDataPath = '.beads/issues.jsonl';

try {
  // Read Cody cleanup summary
  const cleanupContent = fs.readFileSync(cleanupSummaryPath, 'utf8');

  // Read Beads data
  const beadsData = fs.readFileSync(beadsDataPath, 'utf8');
  const beadsIssues = beadsData.split('\n')
    .filter(line => line.trim())
    .map(line => {
      try {
        return JSON.parse(line);
      } catch (e) {
        console.warn('Failed to parse line:', line);
        return null;
      }
    })
    .filter(issue => issue !== null);

  // Analyze Cody cleanup summary
  const codyTasks = [];
  const taskLines = cleanupContent.split('\n');
  let currentPhase = '';
  let inTaskSection = false;

  for (let i = 0; i < taskLines.length; i++) {
    const line = taskLines[i].trim();

    if (line.startsWith('## **Phase') || line.startsWith('## **Progress')) {
      currentPhase = line.replace('## **', '').replace('**', '');
      inTaskSection = true;
      continue;
    }

    if (inTaskSection && line.startsWith('|') && line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      if (parts.length >= 5) {
        const id = parts[1];
        const status = parts[4];
        if (id && status && !id.includes('ID') && id !== '' && id.startsWith('owk-')) {
          codyTasks.push({
            id,
            status,
            phase: currentPhase
          });
        }
      }
    }
  }

  // Analyze Beads issues
  const beadsStatuses = {};
  beadsIssues.forEach(issue => {
    beadsStatuses[issue.id] = issue.status;
  });

  // Compare statuses
  const discrepancies = [];
  const reconciled = [];

  codyTasks.forEach(task => {
    const beadsStatus = beadsStatuses[task.id];
    if (beadsStatus) {
      if (beadsStatus !== mapCodyStatusToBeads(task.status)) {
        discrepancies.push({
          id: task.id,
          codyStatus: task.status,
          beadsStatus: beadsStatus,
          phase: task.phase
        });
      } else {
        reconciled.push({
          id: task.id,
          status: beadsStatus,
          phase: task.phase
        });
      }
    } else {
      discrepancies.push({
        id: task.id,
        codyStatus: task.status,
        beadsStatus: 'NOT_FOUND',
        phase: task.phase
      });
    }
  });

  // Helper function to map Cody status to Beads status
  function mapCodyStatusToBeads(codyStatus) {
    switch (codyStatus) {
      case '🟢': return 'closed';
      case '🟡': return 'in_progress';
      case '🔴': return 'open';
      default: return 'unknown';
    }
  }

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    totalTasks: codyTasks.length,
    reconciledCount: reconciled.length,
    discrepancyCount: discrepancies.length,
    reconciliationRate: ((reconciled.length / codyTasks.length) * 100).toFixed(2) + '%',
    reconciledTasks: reconciled,
    discrepancies: discrepancies,
    beadsIssuesCount: beadsIssues.length,
    codyTasksCount: codyTasks.length
  };

  // Write report
  fs.writeFileSync('beads-cody-reconciliation-report.json', JSON.stringify(report, null, 2));

  console.log('=== Beads-Cody Reconciliation Report ===');
  console.log(`Generated at: ${report.timestamp}`);
  console.log(`Total Cody tasks: ${report.totalTasks}`);
  console.log(`Total Beads issues: ${report.beadsIssuesCount}`);
  console.log(`Reconciled: ${report.reconciledCount} (${report.reconciliationRate})`);
  console.log(`Discrepancies: ${report.discrepancyCount}`);
  
  if (discrepancies.length > 0) {
    console.log('\n=== Discrepancies Found ===');
    discrepancies.forEach(d => {
      console.log(`Task ${d.id}: Cody="${d.codyStatus}" vs Beads="${d.beadsStatus}" (${d.phase})`);
    });
  }

} catch (error) {
  console.error('Error during comparison:', error.message);
  process.exit(1);
}