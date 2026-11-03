import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', 'prisma/migrations/**', 'release/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Formatting is Prettier's job; only the Vue plugin's correctness rules are used.
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Nest uses decorators + constructor injection; empty constructors are normal.
      '@typescript-eslint/no-extraneous-class': 'off',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
);
