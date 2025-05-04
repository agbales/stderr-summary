#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
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
const logFile = path.resolve(argv.log);

// Ensure log directory exists
fs.mkdirSync(path.dirname(logFile), { recursive: true });
const outStream = fs.createWriteStream(logFile, { flags: 'w' });

// Start the dev process
const [cmd, ...args] = devCommand.split(' ');
const devProcess = spawn(cmd, args, { shell: true });

// Pipe process output to terminal and log file
devProcess.stdout.pipe(process.stdout);
devProcess.stderr.pipe(process.stderr);
devProcess.stdout.pipe(outStream);
devProcess.stderr.pipe(outStream);

// Watch for real-time errors on stderr
let buffer = '';
devProcess.stderr.on('data', async (chunk: Buffer) => {
  const text = chunk.toString();
  buffer += text;

  if (
    buffer.match(
      /(ReferenceError|TypeError|SyntaxError|Unhandled|Exception|Error:)/
    )
  ) {
    try {
      console.log('\n[bug-summary-helper] Detected error — summarizing...');
      await summarizeLogFile(logFile);
    } catch (err) {
      console.error('[bug-summary-helper] Failed to summarize:', err);
    }
    buffer = ''; // reset to avoid spamming on same error burst
  }
});

// Still handle exit (in case dev crashes or ends)
let handled = false;
const handleExit = async (code: number) => {
  if (handled) return;
  handled = true;
  console.log(`\n[bug-summary-helper] Dev server exited with code ${code}`);
  await summarizeLogFile(logFile);
};

devProcess.on('close', handleExit);
devProcess.on('exit', handleExit);
devProcess.on('error', err => {
  if (!handled) {
    handled = true;
    console.error(`[bug-summary-helper] Error: ${err.message}`);
    summarizeLogFile(logFile);
  }
});
