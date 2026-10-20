import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
 {ignores:['dist/**','node_modules/**','supabase/functions/**']},
 js.configs.recommended,...tseslint.configs.recommended,
 {files:['**/*.{js,mjs,ts,tsx}'],languageOptions:{globals:{console:'readonly',process:'readonly',fetch:'readonly',AbortSignal:'readonly',setTimeout:'readonly',clearTimeout:'readonly',URL:'readonly',Buffer:'readonly',window:'readonly',document:'readonly',location:'readonly',crypto:'readonly',localStorage:'readonly'}}},
 {files:['src/**/*.{ts,tsx}'],rules:{'@typescript-eslint/no-explicit-any':'error'}}
);
