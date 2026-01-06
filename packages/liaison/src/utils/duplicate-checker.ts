/**
 * Duplicate Checker Utility
 * Wraps the Python duplicate-prevention.py script
 * Prevents duplicate task creation by checking similarity with existing issues
 */

import { spawn } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const DUPLICATE_SCRIPT = path.join(REPO_ROOT, 'scripts', 'duplicate-prevention.py');

export interface DuplicateMatch {
  id: string;
  title: string;
  similarity: number;
}

export interface DuplicateCheckResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
  error?: string;
}

/**
 * Check for duplicate issues using the duplicate-prevention.py script
 * @param title Issue title to check
 * @param interactive Whether to run in interactive mode
 * @returns Duplicate check result with matches
 */
export async function checkForDuplicates(
  title: string,
  interactive: boolean = false
): Promise<DuplicateCheckResult> {
  return new Promise((resolve) => {
    const args = [DUPLICATE_SCRIPT, title];
    if (interactive) {
      args.push('--interactive');
    }

    const child = spawn('python3', args, {
      cwd: REPO_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let _stderr = '';
    let _timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    // Set a timeout to prevent hanging
    _timeoutHandle = setTimeout(() => {
      child.kill();
      resolve({
        hasDuplicates: false,
        matches: [],
        error: 'Duplicate check timeout',
      });
    }, 10000); // 10 second timeout

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      _stderr += data.toString();
    });

    child.on('close', (_exitCode) => {
      if (_timeoutHandle) clearTimeout(_timeoutHandle);

      // Parse output to extract matches
      const matches: DuplicateMatch[] = [];
      let hasDuplicates = false;

      try {
        // Normalize output to handle unicode characters
        // eslint-disable-next-line no-control-regex
        const normalized = stdout
          .replace(/[\u0000-\u001F]/g, '') // Remove control characters
          .toLowerCase();

        // Check if "No duplicates found" is in output
        if (normalized.includes('no duplicates found')) {
          hasDuplicates = false;
        } else if (
          normalized.includes('potential duplicate') ||
          (normalized.includes('found') && normalized.includes('potential'))
        ) {
          hasDuplicates = true;
          // Extract issue IDs and similarity scores from output
          const lines = stdout.split('\n');

          // Process lines to find ID and similarity on separate or same lines
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const idMatch = line.match(/owk-[a-z0-9]+/i);

            if (idMatch) {
              // Found an issue ID, now look for similarity
              let similarity = 0;
              let title = '';

              // Extract title from same line (after ID, before Similarity or end)
              const titleMatch = line.match(/:\s*(.+?)(?:\s+Similarity|$)/);
              if (titleMatch) {
                title = titleMatch[1].trim();
              }

              // Look for Similarity on same line
              const simMatch = line.match(/Similarity:\s*(\d+(?:\.\d+)?)%/);
              if (simMatch) {
                similarity = parseFloat(simMatch[1]) / 100;
              } else if (i + 1 < lines.length) {
                // Look on next line for Similarity
                const nextLine = lines[i + 1];
                const nextSimMatch = nextLine.match(/Similarity:\s*(\d+(?:\.\d+)?)%/);
                if (nextSimMatch) {
                  similarity = parseFloat(nextSimMatch[1]) / 100;
                }
              }

              if (title && similarity > 0) {
                matches.push({
                  id: idMatch[0].toLowerCase(),
                  title,
                  similarity,
                });
              }
            }
          }
        }

        resolve({
          hasDuplicates,
          matches,
          error: undefined,
        });
      } catch (err) {
        resolve({
          hasDuplicates: false,
          matches: [],
          error: `Failed to parse duplicate check: ${err}`,
        });
      }
    });

    child.on('error', (err) => {
      if (_timeoutHandle) clearTimeout(_timeoutHandle);
      resolve({
        hasDuplicates: false,
        matches: [],
        error: `Failed to run duplicate check: ${err.message}`,
      });
    });
  });
}

/**
 * Format duplicate matches for display
 */
export function formatDuplicateMatches(matches: DuplicateMatch[]): string {
  if (matches.length === 0) {
    return '';
  }

  const lines = ['⚠️  Found potential duplicates:'];
  for (const match of matches) {
    const percent = Math.round(match.similarity * 100);
    lines.push(`   ${match.id}: "${match.title}" (${percent}% match)`);
  }
  return lines.join('\n');
}
