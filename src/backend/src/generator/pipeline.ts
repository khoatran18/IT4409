import { buildContext } from './steps/build-context';
import { normalize } from './steps/normalize';
import { pack } from './steps/pack';
import { render } from './steps/render';
import { validate } from './steps/validate';
import type { GeneratedFile } from './types';

export function generate(
  input: unknown,
  templatesDir?: string,
): GeneratedFile[] {
  const schema = validate(input);
  const normalized = normalize(schema);
  const context = buildContext(normalized);
  return pack(render(context, templatesDir));
}
