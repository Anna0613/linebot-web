import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const root = resolve('src');
function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[jt]sx?$/.test(path) && !path.endsWith('.d.ts') ? [path] : [];
  });
}

test('every application module is reachable from the browser entry or one of its workers', () => {
  const files = new Set(sourceFiles(root));
  const visited = new Set();
  const options = ts.getParsedCommandLineOfConfigFile('tsconfig.app.json', {}, {
    ...ts.sys, onUnRecoverableConfigFileDiagnostic(diagnostic) { assert.fail(String(diagnostic.messageText)); },
  }).options;

  function visit(file) {
    if (visited.has(file)) return;
    visited.add(file);
    const tree = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);

    function follow(node) {
      let reference;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) reference = node.moduleSpecifier;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) reference = node.arguments[0];
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'URL') reference = node.arguments?.[0];
      if (reference && ts.isStringLiteralLike(reference)) {
        const spec = reference.text;
        if (spec.startsWith('.') || spec.startsWith('@/')) {
          const target = ts.resolveModuleName(spec, file, options, ts.sys).resolvedModule?.resolvedFileName;
          if (target && files.has(target)) visit(target);
          else if (/\.[jt]sx?$/.test(spec)) assert.fail(`Unresolved source ${spec} from ${dirname(file)}`);
        }
      }
      ts.forEachChild(node, follow);
    }
    follow(tree);
  }

  visit(join(root, 'start.tsx'));
  assert.deepEqual([...files].filter(file => !visited.has(file)), []);
});
