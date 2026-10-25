function words(input: string): string[] {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.toLowerCase());
}

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

export function pascalCase(input: string): string {
  return words(input).map(capitalize).join('');
}

export function camelCase(input: string): string {
  const [first = '', ...rest] = words(input);
  return first + rest.map(capitalize).join('');
}

export function kebabCase(input: string): string {
  return words(input).join('-');
}

const IRREGULAR: Record<string, string> = {
  person: 'people',
  child: 'children',
  man: 'men',
  woman: 'women',
};

/** Số nhiều tiếng Anh cho phần lớn tên entity; giữ nguyên kiểu chữ của từ cuối. */
export function plural(input: string): string {
  const match = /^(.*?)([A-Za-z]+)$/.exec(input);
  if (!match) return input;
  const [, head, last] = match;
  const lower = last.toLowerCase();

  const irregular = IRREGULAR[lower];
  if (irregular) {
    return (
      head +
      (last[0] === last[0].toUpperCase() ? capitalize(irregular) : irregular)
    );
  }
  if (/(s|x|z|ch|sh)$/i.test(last)) return `${head}${last}es`;
  if (/[^aeiou]y$/i.test(last)) return `${head}${last.slice(0, -1)}ies`;
  return `${head}${last}s`;
}
