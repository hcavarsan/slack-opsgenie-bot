import { readFile, writeFile, mkdir } from 'fs/promises';
import { glob } from 'glob';
import path from 'path';
import fs from 'fs/promises';

async function ensureDirectoryExists(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function resolveImportPath(currentFile, importPath) {
  const currentDir = path.dirname(currentFile);
  const targetPath = path.join('dist', importPath.replace('@/', ''));

  try {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      const indexPath = path.join(targetPath, 'index.js');
      try {
        await fs.access(indexPath);
        const relativePath = path.relative(currentDir, indexPath)
          .split(path.sep)
          .join('/');
        const normalizedPath = relativePath.startsWith('.') ? relativePath : './' + relativePath;
        return normalizedPath.replace(/\.js$/, '');
      } catch {
      }
    }
  } catch {
  }

  const relativePath = path.relative(currentDir, targetPath)
    .split(path.sep)
    .join('/');
  return (relativePath.startsWith('.') ? relativePath : './' + relativePath).replace(/\.js$/, '');
}

async function fixImports() {
  try {
    console.log('Starting import fixes...');

    const files = await glob('dist/**/*.js');
    console.log('\nProcessing files:');

    for (const file of files) {
      console.log(`Processing ${file}...`);
      let content = await readFile(file, 'utf8');

      const importMatches = content.match(/from ['"].*['"]/g);
      if (importMatches) {
        console.log('  Original imports:', importMatches);
      }

      const imports = content.match(/from ['"]@\/[^'"]+['"]/g) || [];
      for (const importStatement of imports) {
        const importPath = importStatement.match(/['"]@\/([^'"]+)['"]/)[1];
        const normalizedPath = await resolveImportPath(file, importPath);
        const newImport = `from '${normalizedPath}.js'`;
        content = content.replace(importStatement, newImport);
        console.log(`  Replacing ${importStatement} with ${newImport}`);
      }

      content = content.replace(
        /from ['"](\.[^'"]+)['"]/g,
        (match, importPath) => {
          if (importPath.endsWith('.js')) return match;
          console.log(`  Adding .js to ${match}`);
          return `from '${importPath}.js'`;
        }
      );

      await ensureDirectoryExists(file);
      await writeFile(file, content);
    }

    console.log('\nImport fixes completed');
  } catch (error) {
    console.error('Error fixing imports:', error);
    process.exit(1);
  }
}

fixImports();
