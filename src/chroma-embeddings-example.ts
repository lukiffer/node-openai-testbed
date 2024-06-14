import chalk from 'chalk';

// eslint-disable-next-line @typescript-eslint/naming-convention
import { ChromaClient, OpenAIEmbeddingFunction } from 'chromadb';


function reduceContent(source: any[]): any[] {
  const results: any[] = [];

  for (const input of source) {
    if (Object.keys(input).includes('text')) {
      results.push(input.text);
    }

    if (Object.keys(input).includes('content')) {
      results.push(...reduceContent(input.content));
    }
  }

  return results;
}

function chunkText(source: string[]): string[] {
  return source.join(' ')
    .replace(/\n/gm, ' ')
    .replace(/\s+/gm, ' ')
    .replace(/[\s\S]{1,256}(?!\S)/g, '$&\n')
    .split('\n')
    .filter(x => x.length > 0);
}

async function main(): Promise<void> {
  const chroma = new ChromaClient({ path: 'http://localhost:8000' });

  const embeddingFunction = new OpenAIEmbeddingFunction({
    // eslint-disable-next-line @typescript-eslint/naming-convention
    openai_api_key: process.env.OPENAI_API_KEY!,
  });

  const collection = await chroma.createCollection({
    name: 'openai-embedding-example',
    embeddingFunction,
  });

  // This dataset is just used as an example. Don't expect semantic similarities when querying chroma.
  // You should replace this with your own dataset, populating:
  // - `id` with a unique identifier for each record
  // - `tags` with an array of metadata for each record
  // - `content` with the text content of each record
  const data: any[] = [{
    id: 1,
    tags: ['example', 'foo'],
    content: 'The quick brown fox jumped over the lazy dog.',
  }, {
    id: 2,
    tags: ['example', 'bar'],
    content: 'Grumpy wizards make a toxic brew for the jovial queen.',
  }];

  for (const record of data) {
    console.log(chalk.bold.magenta(`Processing record ${ record.id }...`));
    const chunks = chunkText(reduceContent(record.content));

    let i = 0;
    for (const chunk of chunks) {
      i++;
      console.log(`Adding chunk ${ i } of ${ chunks.length }...`);
      await collection.add({
        ids: [`${ record.id }:${ i.toString(10) }`],
        metadatas: [{
          tags: record.tags,
        }],
        documents: [chunk],
      });
    }
  }
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
