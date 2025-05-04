import fs from 'fs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const constructPrompt = (logContent: string) => {
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

export async function summarizeLogFile(logFilePath: string) {
  try {
    const content = fs.readFileSync(logFilePath, 'utf-8');

    if (!content.trim()) {
      console.log(chalk.yellow('[stderr-summary] Log file is empty.'));
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
      console.log(chalk.green('\n[stderr-summary]\n'));
      if (json?.error) {
        const label = chalk.bgBlue('[Error]');
        const errorDescription = chalk.blue(`${json.error}`);
        console.log(`${label}, ${errorDescription}`);
      }
      if (json?.fix) {
        const label = chalk.bgYellow('[Fix]');
        const fixDescription = chalk.yellow(
          json.fix
            .map((bullet: string) => {
              return `- ${bullet}`;
            })
            .join('\n')
        );
        console.log(label);
        console.log(fixDescription);
      }
    } else {
      console.log(chalk.red('[stderr-summary] No summary returned.'));
    }
  } catch (error) {
    console.error(chalk.red('[stderr-summary] ERROR'), error);
  }
}
