import type { Database } from '@codeflow/schema';
import { mysql } from './mysql';
import { postgres } from './postgres';
import type { DbProfile } from './types';

export const dbProfiles: Record<Database, DbProfile> = { postgres, mysql };

export type { DbEnv, DbProfile } from './types';
