const fs = require('fs');

// Read Cody cleanup summary
const cleanupContent = fs.readFileSync('.cody/project/versions/v0.5.0/tasklist.md', 'utf8');
const taskLines = cleanupContent.split('\n');

console.log('=== Debugging Cody Tasklist Parsing ===');
console.log('First 20 lines:');
taskLines.slice(0, 20).forEach((line, i) => {
  console.log(`${i + 1}: "${line}"`);
});

console.log('\n=== Looking for table rows ===');
const tableRows = taskLines.filter(line => 
  line.trim().startsWith('|') && 
  line.includes('|') && 
  line.split('|').length >= 5
);

console.log(`Found ${tableRows.length} table rows`);
tableRows.slice(0, 5).forEach((row, i) => {
  const parts = row.split('|').map(p => p.trim());
  console.log(`Row ${i + 1}: parts=${JSON.stringify(parts)}`);
  if (parts.length >= 5) {
    const id = parts[1];
    const status = parts[4];
    console.log(`  -> ID="${id}", Status="${status}"`);
  }
});