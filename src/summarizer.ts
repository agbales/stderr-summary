import fs from 'fs';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const constructPrompt = (logContent: string) => {
  return `Analyze the following log file and provide:
1. A one-sentence summary of the error.
2. A list of bullet points suggesting fixes.

Log content:
\`\`\`
${logContent}
\`\`\``;
};

export async function summarizeLogFile(logFilePath: string) {
  try {
    const content = fs.readFileSync(logFilePath, 'utf-8');

    if (!content.trim()) {
      console.log('[bug-summary-helper] Log file is empty.');
      return;
    }

    const prompt = constructPrompt(content);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const summary = response.choices[0]?.message?.content?.trim();

    if (summary) {
      console.log('\n[bug-summary-helper]\n');
      console.log(summary);
    } else {
      console.log('[bug-summary-helper] No summary returned.');
    }
  } catch (error) {
    console.error('[bug-summary-helper] ERROR', error);
  }
}
