import chalk from 'chalk';

// eslint-disable-next-line @typescript-eslint/naming-convention
import { ChromaClient } from 'chromadb';
import { JiraService } from './jira.service';
import { promises as fs } from 'fs';
// eslint-disable-next-line @typescript-eslint/naming-convention
import OpenAI from 'openai';

const jira = new JiraService();
const openai = new OpenAI();

function reduceContent(source: any[]): any[] {
  try {
    const results: any[] = [];
    source.forEach(x => {
      if (x.text) {
        results.push(x.text);
      }

      if (x.content && x.content.length > 0) {
        results.push(...reduceContent(x.content));
      }
    });

    return results;
  }
  catch (e) {
    console.error(chalk.yellow(e));
    return [];
  }
}

// function chunkText(source: string[]): string[] {
//   return source.join(' ')
//     .replace(/\n/gm, ' ')
//     .replace(/\s+/gm, ' ')
//     .replace(/[\s\S]{1,256}(?!\S)/g, '$&\n')
//     .split('\n')
//     .filter(x => x.length > 0);
// }

async function getIssues(): Promise<any[]> {
  const cache = JSON.parse(await fs.readFile('cache.json', 'utf8'));

  if (!cache.issues) {
    cache.issues = await jira.getPagedResult('issueSearch', 'searchForIssuesUsingJql', {
      jql: 'project IN (AELDEV, DATA) AND issuetype IN standardIssueTypes() AND statusCategory != Done',
    }, 'issues');

    await fs.writeFile('cache.json', JSON.stringify(cache, null, 2), 'utf8');
  }

  return cache.issues;
}

function truncateString(input: string, maxTokens: number): string {
  const maxLength = Math.round(maxTokens * 1.6); // estimate using typical characters per token.
  if (input.length > maxLength) {
    console.log(chalk.blue(`Truncating input to ${ maxLength } characters.`));
    return input.substring(0, maxLength);
  }

  return input;
}

async function main(): Promise<void> {
  console.log(chalk.bold.cyan('Capturing issue embeddings for open Jira issues...'));

  const chroma = new ChromaClient({ path: 'http://localhost:8000' });
  const collection = await chroma.getOrCreateCollection({
    name: 'jira-issues',
  });

  const issues = await getIssues();
  let i = 0;
  for (const issue of issues) {
    i++;
    console.log(chalk.dim(`[${ i } / ${ issues.length }] :: `) + chalk.bold(`Processing issue ${ issue.key }...`));
    const document = truncateString([
      issue.fields.summary,
      ...reduceContent(issue.fields.description?.content)
    ].join('\n'), 8192);

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: document,
    });

    console.log(chalk.magenta('Writing embeddings to database...'));
    await collection.add({
      ids: [ issue.key ],
      documents: [ document ],
      embeddings: [ response.data[0].embedding ],
      metadatas: [{
        issueType: issue.fields.issuetype.name,
        labels: issue.fields.labels,
      }],
    });

    console.log(chalk.green(`Successfully saved embeddings for issue ${ issue.key }.`));
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
