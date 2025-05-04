import fs from 'fs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const constructPrompt = (logContent) => {
    return `Analyze the following log file and provide the following JSON output:
 - error: one-sentence summary of the error.
 - fix: array of bullet points to resolve error.

 Example:

{
  "error": "TypeError: Cannot read properties of undefined (reading 'map')",
  "fix": [
    "Check if the variable is defined before accessing its properties.",
    "Use optional chaining to avoid runtime errors."
  ]
}

Log content:
\`\`\`
${logContent}
\`\`\``;
};
export async function summarizeLogFile(logFilePath) {
    try {
        const content = fs.readFileSync(logFilePath, 'utf-8');
        if (!content.trim()) {
            console.log(chalk.yellow('[bug-summary-helper] Log file is empty.'));
            return;
        }
        const recentLogContent = content.slice(-3000);
        const prompt = constructPrompt(recentLogContent);
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: {
                type: 'json_object',
            },
        });
        const out = response.choices[0]?.message?.content?.trim();
        const json = out ? JSON.parse(out) : null;
        if (json) {
            console.log(chalk.green('\n[bug-summary-helper]\n'));
            if (json?.error) {
                console.log(chalk.bgBlue('[Error summary]'));
                console.log(chalk.blue(`${json.error}`));
            }
            if (json?.fix) {
                console.log(chalk.bgYellow('[Fix]'));
                console.log(chalk.yellow(json.fix
                    .map((bullet) => {
                    return `- ${bullet}`;
                })
                    .join('\n')));
            }
        }
        else {
            console.log(chalk.red('[bug-summary-helper] No summary returned.'));
        }
    }
    catch (error) {
        console.error(chalk.red('[bug-summary-helper] ERROR'), error);
    }
}
