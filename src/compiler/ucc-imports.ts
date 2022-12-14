import { UccAliases } from './ucc-aliases.js';
import { UccCode } from './ucc-code.js';
import { uccStringExprContent } from './ucc-expr.js';

export class UccImports {

  readonly #imports = new Map<string, Map<string, string>>();
  readonly #aliases: UccAliases;

  constructor(aliases: UccAliases) {
    this.#aliases = aliases;
  }

  import(from: string, name: string): string {
    let moduleImports = this.#imports.get(from);

    if (moduleImports) {
      const imported = moduleImports.get(name);

      if (imported) {
        return imported;
      }
    } else {
      moduleImports = new Map();
      this.#imports.set(from, moduleImports);
    }

    const alias = this.#aliases.aliasFor(name);

    moduleImports.set(name, alias);

    return alias;
  }

  asStatic(): UccCode.Source {
    return {
      printTo: lines => {
        for (const [from, moduleImports] of this.#imports) {
          if (moduleImports.size > 1) {
            lines
              .print(`import {`)
              .indent(lines => {
                for (const [name, alias] of moduleImports) {
                  lines.print(`${this.#staticClause(name, alias)},`);
                }
              })
              .print(`} from '${uccStringExprContent(from)}';`);
          } else {
            for (const [name, alias] of moduleImports) {
              lines.print(`import { ${this.#staticClause(name, alias)} } from '${from}';`);
            }
          }
        }
      },
    };
  }

  #staticClause(name: string, alias: string): string {
    return name === alias ? name : `${name} as ${alias}`;
  }

  asDynamic(): UccCode.Source {
    return {
      printTo: lines => {
        for (const [from, moduleImports] of this.#imports) {
          if (moduleImports.size > 1) {
            lines
              .print('const {')
              .indent(lines => {
                for (const [name, alias] of moduleImports) {
                  lines.print(`${this.#dynamicClause(name, alias)},`);
                }
              })
              .print(`} = await import('${uccStringExprContent(from)}');`);
          } else {
            for (const [name, alias] of moduleImports) {
              lines.print(
                `const { ${this.#dynamicClause(
                  name,
                  alias,
                )} } = await import('${uccStringExprContent(from)}');`,
              );
            }
          }
        }
      },
    };
  }

  #dynamicClause(name: string, alias: string): string {
    return name === alias ? name : `${name}: ${alias}`;
  }

}

export namespace UccImports {
  export interface Static extends UccImports {
    isStatic(): true;
    isDynamic(): false;
  }
  export interface Static extends UccImports {
    isStatic(): false;
    isDynamic(): true;
  }
}
