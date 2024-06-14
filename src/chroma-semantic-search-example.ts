import chalk from 'chalk';

/* eslint-disable @typescript-eslint/naming-convention */
import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
/* eslint-enable @typescript-eslint/naming-convention */

async function main(): Promise<void> {
  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  const collection = await chroma.getCollection({ name: 'openai-embedding-example' });

  const openai = new OpenAI();
  const embeddings = await openai.embeddings.create({
    input: 'What do foxes jump over?',
    model: 'text-embedding-ada-002',
  });

  const results = await collection.query({
    queryEmbeddings: embeddings.data[0].embedding,
    whereDocument: ({
      '$and': [{
        // eslint-disable-next-line @typescript-eslint/naming-convention
        '$not_contains': 'some negative search string',
      }],
    } as any),
  });

  console.log(results);
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
