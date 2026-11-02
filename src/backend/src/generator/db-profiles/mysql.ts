import type { DbProfile } from './types';

/** Khung khai báo; tuần 4 hoàn thiện (template backend hiện chỉ có adapter Postgres) */
export const mysql: DbProfile = {
  id: 'mysql',
  prismaProvider: 'mysql',
  defaultPort: 3306,
  image: 'mysql:8',
  databaseUrl: (env) =>
    `mysql://${env.user}:${env.password}@${env.host}:${env.port}/${env.name}`,
  composeService: (env) => `  db:
    image: mysql:8
    environment:
      MYSQL_DATABASE: ${env.name}
      MYSQL_USER: ${env.user}
      MYSQL_PASSWORD: ${env.password}
      MYSQL_RANDOM_ROOT_PASSWORD: "yes"
    ports:
      - "127.0.0.1:\${DB_PORT:-3306}:3306"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
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
  envDefaults: { DB_PORT: '3306' },
};
