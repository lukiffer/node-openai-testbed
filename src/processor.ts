import OpenAI from 'openai';
import fs from 'fs';

import { Message } from './message.type';

export class Processor {

  private readonly client: OpenAI;

  public readonly messages: Message[];

  public constructor() {
    this.client = new OpenAI();
    this.messages = [];
    this.messages.push({
      role: 'system',
      content: fs.readFileSync('./src/data/llm-system-guidance.txt', 'utf8'),
    });
  }

  public async process(messages: Message[]): Promise<any> {
    this.messages.push(...messages);
    const response = await this.client.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: this.messages,
    });

    return response.choices[0].message.content;
  }
}
