#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { summarizeLogFile } from './summarizer';

const argv = yargs(hideBin(process.argv))
  .option('cmd', {
    type: 'string',
    description: 'Command to run (e.g., "next dev")',
    demandOption: true,
  })
  .option('log', {
    type: 'string',
    description: 'Path to log file (default: ".bug-summary-helper/dev.log")',
    default: path.resolve('.bug-summary-helper/dev.log'),
  })
  .parseSync();

const devCommand = argv.cmd;
const logFilePath = path.resolve(argv.log);

// Ensure log directory exists
fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
const outStream = fs.createWriteStream(logFilePath, { flags: 'w' });

// Start the dev process
const [cmd, ...args] = devCommand.split(' ');
const devProcess = spawn(cmd, args, { shell: true });

// Handle process output
devProcess.stdout.pipe(process.stdout);
devProcess.stderr.pipe(process.stderr);
devProcess.stdout.pipe(outStream);
devProcess.stderr.pipe(outStream);

// Centralize summarization to avoid multiple triggers
let summarizationTriggered = false;
async function triggerSummarization(): Promise<void> {
  if (summarizationTriggered) return;
  summarizationTriggered = true;
  try {
    console.log('\n[bug-summary-helper] Summarizing log file...');
    await summarizeLogFile(logFilePath);
  } catch (err) {
    console.error('[bug-summary-helper] Failed to summarize:', err);
  }
}

// Watch real-time errors on stderr
let buffer = '';
devProcess.stderr.on('data', async (chunk: Buffer) => {
  const text = chunk.toString();
  buffer += text;

  if (
    buffer.match(
      /(ReferenceError|TypeError|SyntaxError|Unhandled|Exception|Error:)/
    )
  ) {
    console.log('\n[bug-summary-helper] Detected error — summarizing...');
    await triggerSummarization();
    buffer = ''; // reset to avoid spamming on same error burst
  }
});

// Handle exit (dev crashes or ends)
const handleExit = async (code: number) => {
  console.log(`\n[bug-summary-helper] Dev server exited with code ${code}`);
  await triggerSummarization();
};

devProcess.on('close', handleExit);
devProcess.on('exit', handleExit);
devProcess.on('error', err => {
  console.error(`[bug-summary-helper] Error: ${err.message}`);
  triggerSummarization();
});
