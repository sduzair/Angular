// @ts-nocheck
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import jasmine from 'eslint-plugin-jasmine';
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
      'rxjs-angular-x/prefer-composition': 'off',
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
      'no-param-reassign': ['error', { props: true }],
      '@typescript-eslint/prefer-for-of': 'off',
      'prefer-const': 'off',

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
            // allow test/dev fixtures when developing
            // @ts-ignore
            ...(process.env.NODE_ENV === 'production' || true
              ? // ...(process.env.NODE_ENV === 'production'
                [
                  {
                    group: ['**/*.fixture'],
                    message:
                      'Test fixtures can only be imported in .spec.ts files',
                  },
                ]
              : []),
            {
              group: ['**/diff/*'],
              message:
                'Please interface with this library code using change log module',
            },
            {
              group: ['**/echarts/*'],
              message:
                'import charts only in lazily loaded analytics component',
            },
          ],
        },
      ],
      'no-constant-binary-expression': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.fixture.ts'],
    plugins: { jasmine: jasmine },
    rules: {
      'no-restricted-imports': ['off'],
      ...jasmine.configs.recommended.rules,
      'jasmine/no-unsafe-spy': ['off'],
    },
  },
  {
    files: ['**/analytics/**/*.ts'],
    rules: {
      'no-restricted-imports': ['off'],
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
