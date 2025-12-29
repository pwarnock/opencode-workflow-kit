import { createSignal, createEffect, Show, For } from 'solid-js';
import { useKeyboard } from '@opentui/solid';
import { discoverComponents, removeComponent, type Component } from '../../tui-hooks/use-components';
import type { TabType } from '../types';

// Track Ctrl+C state globally so it persists
let ctrlCCount = 0;
let ctrlCTimeout: ReturnType<typeof setTimeout> | null = null;

export default function App() {
  const [activeTab, setActiveTab] = createSignal<TabType>('skills');
  const [showHelp, setShowHelp] = createSignal(false);
  const [components, setComponents] = createSignal<Component[]>([]);
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [statusMessage, setStatusMessage] = createSignal('');

  const loadComponents = async (tab: TabType) => {
    const comps = await discoverComponents(tab);
    setComponents(comps);
    setSelectedIndex(null);
    setStatusMessage('');
  };

  createEffect(() => {
    loadComponents(activeTab());
  });

  const handleDelete = async () => {
    const idx = selectedIndex();
    const comps = components();

    if (idx === null || !comps[idx]) {
      return;
    }

    const component = comps[idx];
    const result = await removeComponent(component);

    if (result.success) {
      setStatusMessage(`✅ ${result.message}`);
      await loadComponents(activeTab());
    } else {
      setStatusMessage(`❌ ${result.message}`);
    }

    setTimeout(() => setStatusMessage(''), 3000);
  };

  const cleanExit = () => {
    process.exit(0);
  };

  const forceExit = () => {
    // Reset terminal before exit - flush with callback
    const reset = '\x1b[?25h\x1b[0m\x1b[?1049l\x1b[?1000l\x1b[?1002l\x1b[?1003l\x1b[?1006l\x1b[?2004l\r\n';
    process.stdout.write(reset, () => {
      process.exit(0);
    });
    // Fallback if callback doesn't fire
    setTimeout(() => process.exit(0), 50);
  };

  useKeyboard((key: { name: string; ctrl?: boolean; shift?: boolean; meta?: boolean }) => {
    // Handle Ctrl+C for double-tap exit
    if (key.ctrl && key.name === 'c') {
      ctrlCCount++;
      
      if (ctrlCCount >= 2) {
        if (ctrlCTimeout) clearTimeout(ctrlCTimeout);
        forceExit();
      } else {
        setStatusMessage('⚠️ Press Ctrl+C again to force quit (or q to exit cleanly)');
        
        // Reset after 2 seconds
        if (ctrlCTimeout) clearTimeout(ctrlCTimeout);
        ctrlCTimeout = setTimeout(() => {
          ctrlCCount = 0;
          setStatusMessage('');
        }, 2000);
      }
      return;
    }

    if (showHelp()) {
      if (key.name === 'escape' || key.name === '?' || key.name === 'q') {
        setShowHelp(false);
      }
      return;
    }

    switch (key.name) {
      case 'escape':
      case 'q':
        cleanExit();
        break;
      case '?':
        setShowHelp(!showHelp());
        break;
      case '1':
        setActiveTab('skills');
        break;
      case '2':
        setActiveTab('agents');
        break;
      case '3':
        setActiveTab('workflows');
        break;
      case '4':
        setActiveTab('plugins');
        break;
      case 'tab':
        const tabs: TabType[] = ['skills', 'agents', 'workflows', 'plugins'];
        const currentIndex = tabs.indexOf(activeTab());
        setActiveTab(tabs[(currentIndex + 1) % tabs.length]);
        break;
      case 'up':
      case 'k':
        if (components().length > 0) {
          const newIndex = selectedIndex() === null
            ? 0
            : Math.max(0, selectedIndex()! - 1);
          setSelectedIndex(newIndex);
        }
        break;
      case 'down':
      case 'j':
        if (components().length > 0) {
          const newIndex = selectedIndex() === null
            ? 0
            : Math.min(components().length - 1, selectedIndex()! + 1);
          setSelectedIndex(newIndex);
        }
        break;
      case 'd':
        handleDelete();
        break;
      case 'r':
        loadComponents(activeTab());
        break;
    }
  });

  const tabs: { key: TabType; label: string; shortcut: string }[] = [
    { key: 'skills', label: 'Skills', shortcut: '1' },
    { key: 'agents', label: 'Agents', shortcut: '2' },
    { key: 'workflows', label: 'Workflows', shortcut: '3' },
    { key: 'plugins', label: 'Plugins', shortcut: '4' },
  ];

  return (
    <box flexDirection="row" style={{ height: '100%', width: '100%' }}>
      {/* Sidebar */}
      <box
        border
        borderColor="#30363d"
        backgroundColor="#0d1117"
        flexDirection="column"
        style={{ width: 20, padding: 1 }}
      >
        <text fg="#58a6ff" style={{ marginBottom: 1 }}>
          Components
        </text>

        <For each={tabs}>
          {(tab) => (
            <box
              backgroundColor={activeTab() === tab.key ? '#1f6feb' : 'transparent'}
              style={{
                padding: 1,
                marginBottom: 0,
              }}
            >
              <text fg={activeTab() === tab.key ? '#ffffff' : '#8b949e'}>
                {activeTab() === tab.key ? '▶ ' : '  '}
                [{tab.shortcut}] {tab.label}
              </text>
            </box>
          )}
        </For>

        <box style={{ marginTop: 2, flexDirection: 'column' }}>
          <text fg="#6e7681">[d] Delete</text>
          <text fg="#6e7681">[r] Refresh</text>
          <text fg="#6e7681">[?] Help</text>
          <text fg="#6e7681">[q] Quit</text>
        </box>
      </box>

      {/* Main content */}
      <box flexDirection="column" style={{ flexGrow: 1 }}>
        <box
          border
          borderColor="#30363d"
          backgroundColor="#161b22"
          style={{ padding: 1, marginBottom: 1 }}
        >
          <text fg="#58a6ff">
            Liaison Manager - {activeTab().charAt(0).toUpperCase() + activeTab().slice(1)}
          </text>
        </box>

        <Show when={statusMessage()}>
          <box
            border
            borderColor={statusMessage().startsWith('⚠️') ? '#d29922' : '#30363d'}
            backgroundColor={statusMessage().startsWith('⚠️') ? '#2d2000' : undefined}
            style={{ padding: 1, marginBottom: 1 }}
          >
            <text fg={statusMessage().startsWith('⚠️') ? '#f0c000' : undefined}>{statusMessage()}</text>
          </box>
        </Show>

        {/* Component list */}
        <box
          border
          borderColor="#30363d"
          backgroundColor="#161b22"
          flexDirection="column"
          style={{ flexGrow: 1, padding: 1 }}
        >
          <text fg="#8b949e" style={{ marginBottom: 1 }}>
            {components().length === 0
              ? `No ${activeTab()} found.`
              : `${components().length} ${activeTab()} found`}
          </text>

          <For each={components()}>
            {(component, index) => (
              <box
                backgroundColor={selectedIndex() === index() ? '#21262d' : 'transparent'}
                style={{
                  padding: 1,
                  marginBottom: 0,
                  width: '100%',
                }}
              >
                <text fg="#58a6ff" style={{ width: '100%' }}>
                  {selectedIndex() === index() ? '▸ ' : '  '}
                  {component.status === 'installed' ? '✅' : '⬜'} {component.name}
                </text>
                <Show when={selectedIndex() === index() && component.description}>
                  <text fg="#6e7681" style={{ paddingLeft: 4, width: '100%' }}>
                    {component.description && component.description.length > 50
                      ? component.description.substring(0, 50) + '...'
                      : component.description}
                  </text>
                </Show>
              </box>
            )}
          </For>
        </box>

        {/* Footer */}
        <box
          border
          borderColor="#30363d"
          backgroundColor="#0d1117"
          style={{ padding: 1, marginTop: 1 }}
        >
          <text fg="#8b949e">
            ↑/k Up  ↓/j Down  Tab Switch  1-4 Jump  d Delete  r Refresh  ? Help  q Quit
          </text>
        </box>
      </box>

      {/* Help overlay */}
      <Show when={showHelp()}>
        <box
          border
          borderColor="#58a6ff"
          backgroundColor="#0d1117"
          style={{
            position: 'absolute',
            left: '20%',
            top: '20%',
            width: '60%',
            height: '60%',
            padding: 2,
          }}
        >
          <text fg="#58a6ff" style={{ marginBottom: 2 }}>Keyboard Shortcuts</text>
          <text fg="#8b949e">1-4     Jump to tab (Skills/Agents/Workflows/Plugins)</text>
          <text fg="#8b949e">Tab     Cycle through tabs</text>
          <text fg="#8b949e">↑/k     Move selection up</text>
          <text fg="#8b949e">↓/j     Move selection down</text>
          <text fg="#8b949e">d       Delete selected component</text>
          <text fg="#8b949e">r       Refresh list</text>
          <text fg="#8b949e">?       Toggle this help</text>
          <text fg="#8b949e">q/Esc   Quit cleanly</text>
          <text fg="#8b949e">Ctrl+C  Force quit (press twice)</text>
          <text fg="#6e7681" style={{ marginTop: 2 }}>Press ? or q to close</text>
        </box>
      </Show>
    </box>
  );
}
