import { AgileClient, Config, Version3Client } from 'jira.js';

export class JiraService {

  public client: Version3Client;

  public agileClient: AgileClient;

  public baseUrl: string;

  public serviceAccount: string;

  public apiToken: string;

  public constructor() {
    this.baseUrl = `https://${ this.getEnvironmentVariable('JIRA_HOST') }`;
    this.serviceAccount = this.getEnvironmentVariable('JIRA_SERVICE_ACCOUNT');
    this.apiToken = this.getEnvironmentVariable('JIRA_API_TOKEN');

    const config: Config = {
      host: this.baseUrl,
      authentication: {
        basic: {
          username: this.serviceAccount,
          password: this.apiToken,
        },
      },
    };

    this.client = new Version3Client(config);
    this.agileClient = new AgileClient(config);
  }

  public getEnvironmentVariable(key: string): string {
    if (!process.env[key]) {
      throw new Error(`Required environment variable "${ key }" is not set.`);
    }
    return process.env[key]!;
  }

  public buildUrl(path: string): string {
    if (path.startsWith('/')) {
      path = path.substring(1);
    }

    return `${ this.baseUrl }/${ path }`;
  }

  public getHeaders(contentType: string = 'application/json'): any {
    return {
      /* eslint-disable @typescript-eslint/naming-convention */
      'content-type': contentType,
      /* eslint-enable @typescript-eslint/naming-convention */
      'accept': 'application/json',
      'authorization': `Basic ${ Buffer.from(`${ this.serviceAccount }:${ this.apiToken }`).toString('base64') }`,
    };
  }

  public async getPagedResult(resource: string, method: string, opts: any = {}, key: string = 'values', start: number = 0, max: number = 50): Promise<any[]> {
    return await this._getPagedResult(this.client, resource, method, opts, key, start, max);
  }

  public async getAgilePagedResult(resource: string, method: string, opts: any = {}, key: string = 'values', start: number = 0, max: number = 50): Promise<any[]> {
    return await this._getPagedResult(this.agileClient, resource, method, opts, key, start, max);
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public async _getPagedResult(client: any, resource: string, method: string, opts: any, key: string, start: number, max: number): Promise<any[]> {
    const paging = {
      startAt: start,
      maxResults: max,
    };

    const results: any[] = [];
    const response = await client[resource][method]({
      ...opts,
      ...paging,
    });

    results.push(...response[key]);

    if (response.total > (response.startAt as number) + (response.maxResults as number)) {
      results.push(...await this._getPagedResult(client, resource, method, opts, key, start + max, max));
    }

    return results;
  }
}
