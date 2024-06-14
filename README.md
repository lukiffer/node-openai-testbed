# node-openai-testbed

This is a test bed for using the OpenAI API via the NodeJS SDK.

## Running Locally

Set the following environment variables:

- `OPENAI_API_KEY`

If you don't already have an API key, you can sign up for one at
[https://platform.openai.com/](https://platform.openai.com/). Note that this is different from your ChatGPT account. You
may receive promotional credits or may be required to "load" your new account with paid credits. At the time of this
writing you can run these examples about a million times for less than $10 USD.

## Examples

- [Chat Completion](./src/chat-completion-example.ts)
- [Storing Embeddings in a Vector Database](./src/chroma-embeddings-example.ts)
- [Vector Database Semantic Search](./src/chroma-semantic-search-example.ts)

For vector database examples, you'll need to either update the connection string in code or run the included
[docker-compose.yaml](./docker-compose.yaml) app via `docker-compose up --build`.
