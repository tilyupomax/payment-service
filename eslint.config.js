import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import prettierConfig from 'eslint-config-prettier';

const sharedTsOverrides = {
  '@typescript-eslint/consistent-type-definitions': 'off',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  '@typescript-eslint/no-unsafe-assignment': 'warn',
  '@typescript-eslint/require-await': 'off',
  'no-undef': 'off',
};

const tsTypeCheckedRules = {
  ...tsPlugin.configs['recommended-type-checked'].rules,
  ...(tsPlugin.configs['stylistic-type-checked']?.rules ?? {}),
  ...sharedTsOverrides,
};

export default [
  {
    ignores: ['dist/**', 'drizzle/**', 'sqlite/**', 'example/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: tsTypeCheckedRules,
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...sharedTsOverrides,
    },
  },
  {
    rules: {
      ...prettierConfig.rules,
    },
  },
];
