import type * as SWC from '@swc/wasm';
import { Awaitable } from '../types';

type RemoveVisitorPrefix<S extends string> = S extends `visit${infer T}`
	? T
	: S;
export type ASTNode =
	| SWC.ModuleDeclaration
	| SWC.Statement
	| SWC.Expression
	| SWC.SpreadElement
	| SWC.Property
	| SWC.PropertyName
	| SWC.JSXExpression
	| SWC.JSXObject
	| SWC.JSXAttributeOrSpread
	| SWC.JSXExpressionContainer;
export type Visitor = {
	[K in ASTNode as `visit${K['type']}`]?: (
		node: K,
		parent: ASTNode | ASTNode[],
	) => ASTNode | void | null | undefined;
};
export type AsyncVisitor = {
	[K in ASTNode as `visit${K['type']}`]?: (
		node: K,
		parent: ASTNode | ASTNode[],
	) => Awaitable<ASTNode | void | null | undefined>;
};

export const visitSync = <
	AST extends SWC.Program | ASTNode,
	ReturnProduct extends boolean,
>(
	ast: AST,
	visitor: Visitor,
	returnProduct: ReturnProduct = false as ReturnProduct,
): ReturnProduct extends true ? AST : undefined => {
	const visitNode = (
		node: ASTNode,
		index: string | number,
		parent: ASTNode | ASTNode[],
	) => {
		if (!node) return;

		const type = node.type as RemoveVisitorPrefix<keyof Visitor>;
		const visit = visitor[`visit${type}`];

		if (visit) {
			// @ts-expect-error
			const result = visit(node, parent);
			if (result) {
				// @ts-expect-error
				parent[index] = result;
			}
		}

		for (const key in node) {
			// @ts-expect-error
			if (typeof node[key] === 'object') {
				const child = node[key as keyof typeof node] as any;
				if (child && typeof child === 'object' && (child as any).type) {
					visitNode(child as any, key as keyof typeof node, node);
				} else if (child && Array.isArray(child) && child.length > 0) {
					for (const c of child) {
						visitNode(c, child.indexOf(c), child);
					}
				}
			}
		}
	};

	if (ast.type === 'Module') {
		for (const item of ast.body) {
			visitNode(item, ast.body.indexOf(item), ast.body);
		}
	} else if (ast.type === 'Script') {
		for (const item of ast.body) {
			visitNode(item, ast.body.indexOf(item), ast.body);
		}
	} else {
		visitNode(ast, 0, [ast]);
	}

	if (returnProduct) return ast as ReturnProduct extends true ? AST : undefined;
	return undefined as ReturnProduct extends true ? AST : undefined;
};

export const visit = async <
	AST extends SWC.Program | ASTNode,
	ReturnProduct extends boolean,
>(
	ast: AST,
	visitor: AsyncVisitor,
	returnProduct: ReturnProduct = false as ReturnProduct,
): Promise<ReturnProduct extends true ? AST : undefined> => {
	const visitNode = async (
		node: ASTNode,
		index: string | number,
		parent: ASTNode | ASTNode[],
	) => {
		if (!node) return;

		const type = node.type as RemoveVisitorPrefix<keyof Visitor>;
		const visit = visitor[`visit${type}`];

		if (visit) {
			// @ts-expect-error
			const result = await visit(node, parent);
			if (result) {
				// @ts-expect-error
				parent[index] = result;
			}
		}

		for (const key in node) {
			// @ts-expect-error
			if (typeof node[key] === 'object') {
				const child = node[key as keyof typeof node] as any;
				if (child && typeof child === 'object' && (child as any).type) {
					await visitNode(child as any, key as keyof typeof node, node);
				} else if (child && Array.isArray(child) && child.length > 0) {
					for (const c of child) {
						await visitNode(c, child.indexOf(c), child);
					}
				}
			}
		}
	};

	if (ast.type === 'Module') {
		for (const item of ast.body) {
			await visitNode(item, ast.body.indexOf(item), ast.body);
		}
	} else if (ast.type === 'Script') {
		for (const item of ast.body) {
			await visitNode(item, ast.body.indexOf(item), ast.body);
		}
	} else {
		await visitNode(ast, 0, [ast]);
	}

	if (returnProduct) return ast as ReturnProduct extends true ? AST : undefined;
	return undefined as ReturnProduct extends true ? AST : undefined;
};

export const visitAny = (
	ast: SWC.Program,
	visitor: (node: ASTNode) => ASTNode | void | null | undefined,
) => {
	const visitNode = (
		node: ASTNode,
		index: string | number,
		parent: ASTNode | ASTNode[],
	) => {
		if (!node) return;

		const result = visitor(node);
		if (result) {
			// @ts-expect-error
			parent[index] = result;
		}

		for (const key in node) {
			// @ts-expect-error
			if (typeof node[key] === 'object') {
				const child = node[key as keyof typeof node] as any;
				if (child && typeof child === 'object' && (child as any).type) {
					visitNode(child as any, key as keyof typeof node, node);
				} else if (child && Array.isArray(child) && child.length > 0) {
					for (const c of child) {
						visitNode(c, child.indexOf(c), child);
					}
				}
			}
		}
	};

	for (const item of ast.body) {
		// @ts-expect-error
		visitNode(item, ast.body.indexOf(item), ast.body);
	}
};

export const removeNodes = (ast: SWC.Program, nodes: ASTNode[]) => {
	const visitNode = (
		node: ASTNode,
		index: string | number,
		parent: ASTNode | ASTNode[],
	) => {
		if (!node) return;

		if (nodes.includes(node)) {
			if (Array.isArray(parent)) {
				parent.splice(index as number, 1);
			} else {
				// @ts-expect-error
				parent[index as keyof typeof parent] = null;
			}
		} else {
			for (const key in node) {
				// @ts-expect-error
				if (typeof node[key] === 'object') {
					const child = node[key as keyof typeof node] as any;
					if (child && typeof child === 'object' && (child as any).type) {
						visitNode(child as any, key as keyof typeof node, node);
					} else if (child && Array.isArray(child) && child.length > 0) {
						for (const c of child) {
							visitNode(c, child.indexOf(c), child);
						}
					}
				}
			}
		}
	};

	for (const item of ast.body) {
		// @ts-expect-error
		visitNode(item, ast.body.indexOf(item), ast.body);
	}
};
