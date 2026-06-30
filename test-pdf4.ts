import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
console.log(typeof PDFParse, Object.keys(PDFParse));
