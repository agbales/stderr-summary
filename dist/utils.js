import fs from 'fs';
import path from 'path';
// Ensure log directory exists
export const getOrCreateLogOutput = (logFilePath) => {
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    const outStream = fs.createWriteStream(logFilePath, { flags: 'w' });
    return outStream;
};
// Pipe process output to terminal and log file
export const pipeProcessOutput = (process, outStream) => {
    process.stdout.pipe(process.stdout);
    process.stderr.pipe(process.stderr);
    process.stdout.pipe(outStream);
    process.stderr.pipe(outStream);
};
