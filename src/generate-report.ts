import chalk from 'chalk';
import { promises as fs } from 'fs';
import handlebars from 'handlebars';

let cache: any;

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

function buildIssueObject(key: string): any {
  const issue = cache.issues.find((y: any) => y.key === key);
  const description = reduceContent(issue.fields.description?.content).join(' ').trim();
  return {
    component: issue.fields.components.length > 0 ? issue.fields.components[0].name : 'Unassigned',
    issueType: issue.fields.issuetype.name,
    issueTypeIconUrl: issue.fields.issuetype.iconUrl,
    assignee: issue.fields.assignee ? issue.fields.assignee.displayName : 'Unassigned',
    assigneeAvatarUrl: issue.fields.assignee ? issue.fields.assignee.avatarUrls['48x48'] : null,
    reporter: issue.fields.reporter.displayName,
    reporterAvatarUrl: issue.fields.reporter.avatarUrls['48x48'],
    status: issue.fields.status.name,
    priority: issue.fields.priority.name,
    priorityIconUrl: issue.fields.priority.iconUrl,
    key: issue.key,
    summary: issue.fields.summary,
    description,
    shortDescription: description.length > 140 ? `${ description.substring(0, 140) }...` : description,
  };
}

async function getData(): Promise<any> {
  cache = JSON.parse(await fs.readFile('cache.json', 'utf8'));
  const data = JSON.parse(await fs.readFile('./output/output.json', 'utf8'));

  const groupedIssues = data.map((x: any) => {
    return {
      ...buildIssueObject(x.key),
      relatedIssues: Object.keys(x.result).map((key: string) => ({
        ...buildIssueObject(key),
        similarity: x.result[key].similarity,
        similarityClass: x.result[key].similarity > 0.8 ? 'high' : x.result[key].similarity > 0.6 ? 'medium' : 'low',
        duplicate: x.result[key].likelyDuplicate,
      })).sort((a: any, b: any) => b.similarity - a.similarity),
    };
  });

  const components: any = {};

  for (const issue of groupedIssues) {
    if (!components[issue.component]) {
      components[issue.component] = [];
    }
    components[issue.component].push(issue);
  }

  return {
    reportDate: new Date().toISOString(),
    components: Object.keys(components).map((x: string) => ({
      name: x,
      issues: components[x],
      issueCount: components[x].length,
      jql: `statusCategory != Done AND key IN (${ components[x].map(y => y.key).join(', ')}) AND (issueLinkType IS EMPTY OR issueLinkType NOT IN ("added to idea"))`,
    })),
  };
}

async function main(): Promise<void> {
  const template = handlebars.compile(await fs.readFile('./src/data/template.html.hbs', 'utf8'));
  const output = template(await getData());
  await fs.writeFile('./output/report.html', output, 'utf8');
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
