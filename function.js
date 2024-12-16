import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, 'dist', 'index.js');

let app;

async function initialize() {
  const module = await import(distPath);
  app = module.app;
}

await initialize();

export { app };
