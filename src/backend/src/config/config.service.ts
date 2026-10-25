import { Injectable } from '@nestjs/common';
import 'dotenv/config';
import { Env, validateEnv } from './env';

@Injectable()
export class ConfigService {
  readonly env: Env = validateEnv(process.env);
}
