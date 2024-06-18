import chalk from 'chalk';
import { promises as fs } from 'fs';

/* eslint-disable @typescript-eslint/naming-convention */
import { ChromaClient, IncludeEnum } from 'chromadb';
import OpenAI from 'openai';
/* eslint-enable @typescript-eslint/naming-convention */

const openai = new OpenAI();

function parseResponse(response: any): any {
  let content = response.choices[0].message.content;
  content = content
    .replace(/^```json/gm, '')
    .replace(/```$/gm, '')
    .trim();
  return JSON.parse(content);
}

async function main(): Promise<void> {
  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  const collection = await chroma.getCollection({ name: 'jira-issues' });

  const cache = JSON.parse(await fs.readFile('cache.json', 'utf8'));
  const feedbackIssues = cache.issues.filter((x: any) => x.fields.issuetype.name === 'Feedback');

  for (const issue of feedbackIssues) {
    console.log(chalk.bold(`Processing issue ${ issue.key }...`));

    const output = JSON.parse(await fs.readFile('./output/output.json', 'utf8'));
    if (output.find((x: any) => x.key === issue.key)) {
      console.log(chalk.yellow(`Issue ${ issue.key } has already been processed.`));
      continue;
    }

    const record = await collection.get({
      ids: [issue.key],
      include: [
        IncludeEnum.Embeddings,
        IncludeEnum.Documents,
        IncludeEnum.Metadatas,
      ],
    });

    const relatedDocuments = await collection.query({
      queryEmbeddings: record.embeddings![0],
      nResults: 6,
      include: [
        IncludeEnum.Documents,
        IncludeEnum.Metadatas,
      ],
    });

    const candidates: any[] = [];

    let i = 0;
    for (const key of relatedDocuments.ids[0]) {
      if (key === issue.key) {
        continue;
      }

      candidates.push({
        key,
        details: relatedDocuments.documents[0][i],
      });

      i++;
    }

    console.log(chalk.bold.yellowBright('Performing LLM-based duplication detection...'));
    const systemMessage: OpenAI.ChatCompletionMessageParam = {
      role: 'system',
      content: await fs.readFile('./src/data/llm-system-guidance.txt', 'utf8'),
    };

    const userMessage: OpenAI.ChatCompletionMessageParam = {
      role: 'user',
      content: JSON.stringify({
        original: {
          key: issue.key,
          details: record.documents[0],
        },
        candidates,
      }),
    };

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [systemMessage, userMessage],
    });

    // await fs.writeFile(`./output/${ issue.key }.json`, JSON.stringify({
    //   response,
    //   userMessage,
    // }, null, 2), 'utf8');

    const result = parseResponse(response);
    for (const key in result) {
      if (result[key].likelyDuplicate) {
        console.log(chalk.rgb(255, 128, 0)((`Issue ${ issue.key } is likely a duplicate of ${ key }.`)));
      }
    }

    output.push({
      key: issue.key,
      result,
    });

    await fs.writeFile('./output/output.json', JSON.stringify(output, null, 2), 'utf8');
    console.log(chalk.green('Successfully wrote LLM disposition to disk.'));
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
