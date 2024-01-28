import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { findUp, pathExists } from 'find-up';
import picomatch from 'picomatch';
import tsconfig from 'tsconfig';
import tsconfigPaths from 'tsconfig-paths';
import { visit } from '../../ast/visit';
import { lazyJiti } from '../../utils/jiti';
import { sutairuError } from '../../utils/stitches-error';
import type { State } from '../all';

export interface Import {
  loader: string;
  ctxt: number;
  source: string;
  value?: string;
  resolved: string;
}

export const extractImports = async ({ ast, loaders, id }: State) => {
  let tsconfigCleanup = () => {};

  try {
    globalThis.require = lazyJiti();
    const tsconfigDir = await findUp(
      async (directory) => {
        const hasTsconfig = await pathExists(join(directory, 'tsconfig.json'));
        return hasTsconfig ? directory : undefined;
      },
      { type: 'directory' },
    );

    if (!tsconfigDir) throw sutairuError('Not tsconfig.json found (find-up)');

    const { config: typescriptConfig, path } = await tsconfig.load(tsconfigDir);

    if (
      typeof typescriptConfig === 'object' &&
      typescriptConfig.compilerOptions?.paths
    ) {
      tsconfigCleanup = tsconfigPaths.register({
        baseUrl:
          typescriptConfig.compilerOptions.baseUrl ||
          (typeof path === 'string' ? dirname(path) : process.cwd()),
        paths: typescriptConfig.compilerOptions.paths,
      });
    }
  } catch {
  } finally {
    globalThis.require = module.require;
  }

  const require = lazyJiti(id);
  const imports: Import[] = [];

  await visit(ast, {
    visitImportDeclaration(importDecl) {
      try {
        let resolved = isAbsolute(importDecl.source.value)
          ? importDecl.source.value
          : resolve(dirname(id), importDecl.source.value);

        let pass = loaders.some(
          (l) =>
            picomatch.isMatch(resolved, l.id) ||
            picomatch.isMatch(importDecl.source.value, l.id),
        );
        if (pass) {
          if (existsSync(resolved)) {
            try {
              resolved = require.resolve(resolved);
            } catch {}
          } else {
            try {
              resolved = require.resolve(importDecl.source.value);
            } catch {}
          }
        }
        if (!pass) {
          try {
            resolved = require.resolve(importDecl.source.value);
            pass = !!resolved;
          } catch {}
          try {
            resolved = require.resolve(resolved);
            pass = !!resolved;
          } catch {}
          if (!pass) return;
        }

        for (const specifier of importDecl.specifiers) {
          if (specifier.type === 'ImportSpecifier') {
            const functionName = specifier.imported
              ? specifier.imported.value
              : specifier.local.value;

            imports.push({
              loader: importDecl.source.value,
              ctxt: importDecl.span.ctxt,
              source: importDecl.source.value,
              value: functionName,
              resolved,
            });
          } else if (specifier.type === 'ImportDefaultSpecifier') {
            imports.push({
              loader: importDecl.source.value,
              ctxt: importDecl.span.ctxt,
              source: importDecl.source.value,
              value: specifier.local.value,
              resolved,
            });
          } else if (specifier.type === 'ImportNamespaceSpecifier') {
            imports.push({
              loader: importDecl.source.value,
              ctxt: importDecl.span.ctxt,
              source: importDecl.source.value,
              value: specifier.local.value,
              resolved,
            });
          }
        }
      } catch {}
    },
  });

  tsconfigCleanup();
  return imports;
};
