import chalk from 'chalk';
import { Processor } from './processor';

async function main(): Promise<void> {
  const processor = new Processor();
  console.log(await processor.process([{
    role: 'user',
    content: 'Write a short, three paragraph story about a dinosaur named Luke.',
  }]));
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
