import { buildContext } from './steps/build-context';
import { formatFiles } from './steps/format';
import { normalize } from './steps/normalize';
import { pack } from './steps/pack';
import { render } from './steps/render';
import { validate } from './steps/validate';
import { toZip } from './steps/zip';
import {
  PLACEHOLDER_DEPLOY,
  type GenerateOptions,
  type GeneratedFile,
} from './types';

async function run(input: unknown, options: GenerateOptions) {
  const normalized = normalize(validate(input));
  const context = buildContext(
    normalized,
    options.deploy ?? PLACEHOLDER_DEPLOY,
  );
  const rendered = render(context, options.templatesDir);
  return {
    name: context.project.kebabName,
    files: pack(await formatFiles(rendered)),
  };
}

export async function generate(
  input: unknown,
  options: GenerateOptions = {},
): Promise<GeneratedFile[]> {
  return (await run(input, options)).files;
}

export interface GeneratedZip {
  /** Tên thư mục gốc trong zip và tên file tải về (không kèm .zip) */
  name: string;
  data: Uint8Array;
}

export async function generateZip(
  input: unknown,
  options: GenerateOptions = {},
): Promise<GeneratedZip> {
  const { name, files } = await run(input, options);
  return { name, data: toZip(files, name) };
}
