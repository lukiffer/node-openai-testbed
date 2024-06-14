import chalk from 'chalk';
import { promises as fs } from 'fs';

// eslint-disable-next-line @typescript-eslint/naming-convention
import OpenAI from 'openai';

async function main(): Promise<void> {
  const openai: OpenAI = new OpenAI();

  const messages: OpenAI.ChatCompletionMessageParam[] = [{
    role: 'system',
    content: await fs.readFile('./src/data/llm-system-guidance.txt', 'utf8'),
  }, {
    role: 'user',
    content: 'Write a short, three paragraph story about a dinosaur named Luke.',
  }];

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages,
  });

  console.log(response);
}

main().then(() => {
  console.log();
  console.log(chalk.bold.green('fin.'));
  process.exit(0);
}, (e) => {
  console.error(chalk.bold.red('An error occurred when processing the request.'));
  console.error(e);
  process.exit(1);
});
