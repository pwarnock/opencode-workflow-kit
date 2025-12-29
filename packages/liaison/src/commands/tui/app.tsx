import { render } from '@opentui/solid';
import App from './components/app';

// Reset terminal to normal state  
function resetTerminal() {
  const reset = [
    '\x1b[?25h',   // Show cursor
    '\x1b[0m',     // Reset colors
    '\x1b[?1049l', // Exit alternate screen
    '\x1b[?1000l', // Disable mouse tracking
    '\x1b[?1002l', 
    '\x1b[?1003l',
    '\x1b[?1006l',
    '\x1b[?2004l', // Disable bracketed paste
    '\x1b[>4;0m',  // Reset modifyOtherKeys
    '\n',
  ].join('');
  process.stdout.write(reset);
}

export async function launchTUI(_options: { color?: boolean } = {}) {
  // Ensure terminal reset on any exit
  process.on('beforeExit', resetTerminal);
  process.on('exit', resetTerminal);

  try {
    await render(() => <App />, {
      onDestroy: () => {
        resetTerminal();
      },
    });
  } catch (error) {
    resetTerminal();
    console.error('TUI Error:', error);
    process.exit(1);
  }
}
