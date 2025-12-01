// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');
const eslintConfigPrettier = require('eslint-config-prettier'); // add the glue plugin

module.exports = defineConfig([
  {
    files: ['**/*.ts'],
    ignores: ['.angular/**', '.nx/**', 'coverage/**', 'dist/**'], // add these ignores
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
      eslintConfigPrettier, // add the glue plugin
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@angular-eslint/template/prefer-control-flow': 'off',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/manual-upload-stepper.component'],
              allowTypeImports: true,
              message:
                'manual-upload-stepper deps like xlsx are lazily loaded. Use dynamic import() instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      angular.configs.templateRecommended,
      angular.configs.templateAccessibility,
    ],
    rules: {},
  },
]);
