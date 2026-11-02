import type { DbProfile } from './types';

export const postgres: DbProfile = {
  id: 'postgres',
  prismaProvider: 'postgresql',
  defaultPort: 5432,
  image: 'postgres:16',
  databaseUrl: (env) =>
    `postgresql://${env.user}:${env.password}@${env.host}:${env.port}/${env.name}`,
  composeService: (env) => `  db:
    image: postgres:16
    environment:
      POSTGRES_DB: ${env.name}
      POSTGRES_USER: ${env.user}
      POSTGRES_PASSWORD: ${env.password}
    ports:
      - "127.0.0.1:\${DB_PORT:-5432}:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${env.user} -d ${env.name}"]
      interval: 5s
      timeout: 5s
      retries: 10
`,
  typeMap: {
    string: 'String',
    text: 'String',
    number: 'Float',
    boolean: 'Boolean',
    date: 'DateTime',
    enum: 'String',
  },
  envDefaults: { DB_PORT: '5432' },
};
