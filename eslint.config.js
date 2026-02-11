const { defineConfig, globalIgnores } = require('eslint/config')
const globals = require('globals')
const react = require('eslint-plugin-react')
const prettier = require('eslint-plugin-prettier/recommended')
const js = require('@eslint/js')
const json = require('eslint-plugin-json')
const importLint = require('eslint-plugin-import')
const tsEsLint = require('typescript-eslint')
const eslint = require('@eslint/js')
const unusedImports = require('eslint-plugin-unused-imports')
const reactHooks = require('eslint-plugin-react-hooks')

module.exports = defineConfig([
  importLint.flatConfigs.recommended,
  eslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  tsEsLint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.commonjs
      },
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    rules: {
      'import/order': 'off',
      indent: 'off',
      '@typescript-eslint/indent': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/brace-style': 'off',
      'react/react-in-jsx-scope': 'off',
      'multiline-ternary': 'off',
      'react/jsx-filename-extension': 'off',
      'import/extensions': 'off',
      'import/no-unresolved': 'off',
      'import/no-import-module-exports': 'off',
      'no-shadow': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_'
        }
      ],
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        {
          accessibility: 'explicit'
        }
      ],
      '@typescript-eslint/array-type': [
        'error',
        {
          default: 'array'
        }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
          allowTypedFunctionExpressions: true,
          allowHigherOrderFunctions: true
        }
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' }
      ]
    },
    plugins: {
      react,
      'unused-imports': unusedImports
    },
    extends: [
      importLint.flatConfigs.recommended,
      importLint.flatConfigs.typescript
    ],
    settings: {
      react: {
        version: 'detect'
      },
      'import/resolver': {
        node: {},
        webpack: {
          config: require.resolve('./.erb/configs/webpack.config.eslint.ts')
        },
        typescript: {}
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx']
      }
    }
  },
  globalIgnores([
    '**/logs',
    '**/*.log',
    '**/pids',
    '**/*.pid',
    '**/*.seed',
    '**/coverage',
    '**/.eslintcache',
    '**/node_modules',
    '**/.DS_Store',
    'eslint.config.js',
    'release/app/dist',
    'release/build',
    '.erb/dll',
    '**/.idea',
    '**/npm-debug.log.*',
    '**/*.css.d.ts',
    '**/*.sass.d.ts',
    '**/*.scss.d.ts',
    '.erb/*',
    '!**/.storybook',
    '**/package.json',
    '**/package-lock.json',
    '**/*.ejs',
    'src/renderer/backend/supabase/types_db.ts'
  ]),
  {
    files: ['**/*.json'],
    ...json.configs['recommended']
  },
  prettier
])
