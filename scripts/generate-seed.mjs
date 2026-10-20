import {readFile,writeFile} from 'node:fs/promises';
import {seedSQL,validateCatalogue} from './catalogue-utils.mjs';
const d=JSON.parse(await readFile(new URL('../data/catalogue.json',import.meta.url),'utf8'));
const sql=seedSQL(d);await writeFile(new URL('../supabase/seed.sql',import.meta.url),sql);console.log(validateCatalogue(d));
