import { buildContext } from './steps/build-context';
import { formatFiles } from './steps/format';
import { normalize } from './steps/normalize';
import { pack } from './steps/pack';
import { render } from './steps/render';
import { validate } from './steps/validate';
import type { GeneratedFile } from './types';

export async function generate(
  input: unknown,
  templatesDir?: string,
): Promise<GeneratedFile[]> {
  const schema = validate(input);
  const normalized = normalize(schema);
  const context = buildContext(normalized);
  const rendered = render(context, templatesDir);
  return pack(await formatFiles(rendered));
}
