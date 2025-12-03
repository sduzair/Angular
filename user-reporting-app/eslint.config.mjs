// @ts-check
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import rxjsAngularX from 'eslint-plugin-rxjs-angular-x';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig([
  {
    files: ['**/*.ts'],
    ignores: ['.angular/**', '.nx/**', 'coverage/**', 'dist/**'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    plugins: {
      'rxjs-angular-x': rxjsAngularX,
    },
    rules: {
      // Angular best practices
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
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/prefer-on-push-component-change-detection': 'warn',
      '@angular-eslint/prefer-output-readonly': 'warn',
      '@angular-eslint/prefer-standalone': 'warn',

      // RxJS best practices
      'rxjs-angular-x/prefer-async-pipe': 'error',
      'rxjs-angular-x/prefer-composition': 'warn',
      'rxjs-angular-x/prefer-takeuntil': [
        'error',
        {
          checkComplete: true,
          checkDecorators: ['Component', 'Directive', 'Injectable'],
          alias: ['takeUntilDestroyed'],
          checkDestroy: false,
        },
      ],

      // TypeScript best practices
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      // Lazy-loading
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
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/button-has-type': 'warn',
      '@angular-eslint/template/use-track-by-function': 'warn',
    },
  },
  eslintConfigPrettier,
]);
