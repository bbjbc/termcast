import next from 'eslint-config-next/core-web-vitals';

/** @type {import('eslint').Linter.Config[]} */
const config = [
  // coverage/ holds the generated HTML report, which ships its own vendored scripts
  { ignores: ['.next/**', 'node_modules/**', 'design/**', 'docs/**', 'coverage/**'] },
  ...next,
];

export default config;
