#!/usr/bin/env bash

# Get the next available task (filter for open/pending tasks)
echo "🎯 Getting next available task..."
node packages/liaison-coordinator/bin/liaison.js task list --format json | sed '1,/^\[/d' | node -e "
  const tasks = JSON.parse(require('fs').readFileSync(0, 'utf8'));
  const nextTasks = tasks.filter(t => t.status !== 'closed');
  if (nextTasks.length > 0) {
    console.log('\\n✨ Next available tasks:');
    nextTasks.slice(0, 5).forEach((task, i) => {
      console.log(\`${i+1}. [\${task.id}] \${task.title} (Priority: \${task.priority || 'N/A'})\`);
    });
    if (nextTasks.length > 5) {
      console.log(\`... and \${nextTasks.length - 5} more tasks\`);
    }
  } else {
    console.log('✅ All tasks are completed!');
  }
"