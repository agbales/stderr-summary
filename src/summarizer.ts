import fs from 'fs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';
import chalk from 'chalk';
import z from 'zod';

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

const ErrorSummarySchema = z.object({
  error: z.string(),
  fix: z.array(z.string()),
});

const logError = (errorDescription: string) => {
  const errMsg = `\n${chalk.bgBlue('[Error]')} ${chalk.blue(
    `${errorDescription}`
  )}`;
  console.log(`${errMsg} \n`);
};

const logFixSuggestions = (fixSuggestions: string[]) => {
  const fixList = fixSuggestions.map(fix => `- ${fix}`).join('\n');
  console.log(chalk.bgYellow('[Fix]'));
  console.log(chalk.yellow(fixList));
  console.log('\n\n');
};

export async function summarizeLogFile(logFilePath: string, model: string) {
  try {
    const logs = fs.readFileSync(logFilePath, 'utf-8');

    if (!logs.trim()) {
      console.log(chalk.yellow('[stderr-summary] Log file is empty.'));
      return;
    }

    const recentLogs = logs.slice(-3000);

    const prompt = constructPrompt(recentLogs);

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: {
        type: 'json_object',
      },
    });

    const content = response.choices[0]?.message?.content?.trim() || '';

    const jsonContent = JSON.parse(content);

    const validatedContent = ErrorSummarySchema.safeParse(jsonContent);

    if (!validatedContent.success) {
      console.error(chalk.red('[stderr-summary] Validation failed'));
      console.error(validatedContent.error.format());
      return;
    }

    logError(validatedContent.data.error);

    logFixSuggestions(validatedContent.data.fix);
  } catch (error) {
    console.error(chalk.red('[stderr-summary] ERROR'), error);
  }
}
