import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import hooks from 'eslint-plugin-react-hooks';
export default tseslint.config(
 { ignores: ['.next/**', '.forge-preview/**', 'node_modules/**', 'next-env.d.ts', 'coverage/**'] },
 js.configs.recommended,
 ...tseslint.configs.recommended,
 { files: ['**/*.{ts,tsx}'], plugins: {'react-hooks': hooks}, rules: {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-unused-vars': ['warn', {argsIgnorePattern: '^_', varsIgnorePattern: '^_'}],
 } },
 { files: ['**/*.{js,mjs,cjs}'], languageOptions: {globals: {process: 'readonly', module: 'readonly', require: 'readonly', __dirname: 'readonly'}} }
);
