import { getNonce } from './utils/get-noonce';

export type RuleGroupNames =
	| 'themed'
	| 'global'
	| 'styled'
	| 'onevar'
	| 'resonevar'
	| 'allvar'
	| 'inline';

export interface SheetGroup {
	sheet: CSSStyleSheet;
	rules: {
		[name in RuleGroupNames]?: RuleGroup;
	} & Record<string, RuleGroup>;
	reset: () => void;
	toString: () => string;
}

class CSSStyleSheet {
	cssRules: CSSRule[];
	href?: string;

	constructor() {
		this.cssRules = [];
	}

	insertRule(cssText: string, index: number) {
		const rule = new CSSRule(1, cssText);
		this.cssRules.splice(index, 0, rule);
	}
}

interface RuleGroup {
	group: CSSMediaRule;
	index: number;
	cache: Set<string | number>;
	apply?: (cssText: string) => void;
}

class CSSRule {
	type: number | string;
	cssText: string;
	cssRules: CSSRule[];

	constructor(type: number | string, cssText: string) {
		this.type = type;
		this.cssText = cssText;
		this.cssRules = [];
	}

	insertRule(cssText: string, index: number) {
		const rule = new CSSRule(1, cssText);
		this.cssRules.splice(index, 0, rule);
	}
}

type CSSStyleRule = CSSRule;

type CSSMediaRule = CSSRule;

type StyleSheetList = CSSStyleSheet[];

/**
 * Rules in the sheet appear in this order:
 * 1. theme rules (themed)
 * 2. global rules (global)
 * 3. component rules (styled)
 * 4. non-responsive variants rules (onevar)
 * 5. responsive variants rules (resonevar)
 * 6. compound variants rules (allvar)
 * 7. inline rules (inline)
 */
export const names: RuleGroupNames[] = [
	'themed',
	'global',
	'styled',
	'onevar',
	'resonevar',
	'allvar',
	'inline',
] as const;

const isSheetAccessible = (sheet: CSSStyleSheet) => {
	if (sheet.href && !sheet.href.startsWith(location.origin)) {
		return false;
	}

	try {
		return !!sheet.cssRules;
	} catch (e) {
		return false;
	}
};

export const createSheet = (root: DocumentOrShadowRoot) => {
	/** Object hosting the hydrated stylesheet. */
	let groupSheet: SheetGroup;

	const toString = () => {
		const { cssRules } = groupSheet.sheet;
		return ([] as CSSRule[]).map
			.call(cssRules, (cssRule, cssRuleIndex) => {
				const { cssText } = cssRule;

				let lastRuleCssText = '';

				if (cssText.startsWith('--sxs')) return '';

				if (
					cssRules[cssRuleIndex - 1] &&
					// biome-ignore lint/suspicious/noAssignInExpressions: This is fine
					(lastRuleCssText = cssRules[cssRuleIndex - 1]!.cssText).startsWith(
						'--sxs',
					)
				) {
					if (!cssRule.cssRules.length) return '';

					for (const name in groupSheet.rules) {
						if (groupSheet.rules[name]?.group === cssRule) {
							return `--sxs{--sxs:${[...groupSheet.rules[name]!.cache].join(
								' ',
							)}}${cssText}`;
						}
					}

					return cssRule.cssRules.length ? `${lastRuleCssText}${cssText}` : '';
				}

				return cssText;
			})
			.join('');
	};

	const reset = () => {
		if (groupSheet) {
			const { rules, sheet } = groupSheet;

			while (Object(Object(sheet.cssRules)[0]).type === 3)
				sheet.cssRules.splice(0, 1);

			sheet.cssRules = [];

			for (const groupName in rules) {
				delete rules[groupName];
			}
		}

		const sheets: StyleSheetList = Object(root).styleSheets || [];

		// iterate all stylesheets until a hydratable stylesheet is found
		for (const sheet of sheets) {
			if (!isSheetAccessible(sheet)) continue;

			for (let index = 0, rules = sheet.cssRules; rules[index]; ++index) {
				/** Possible indicator rule. */
				const check: CSSStyleRule = Object(rules[index]);

				// a hydratable set of rules will start with a style rule (type: 1), ignore all others
				if (check.type !== 1) continue;

				/** Possible styling group. */
				const group: CSSMediaRule = Object(rules[index + 1]);

				// a hydratable set of rules will follow with a media rule (type: 4), ignore all others
				if (group.type !== 4) continue;

				++index;

				const { cssText } = check;

				// a hydratable style rule will have a selector of `--sxs`, ignore all others
				if (!cssText.startsWith('--sxs')) continue;

				const cache = cssText.slice(14, -3).trim().split(/\s+/);
				const cache0 = cache[0] as unknown as number | undefined;

				if (!cache0) continue;

				/** Name of the group. */
				const groupName = names[cache0];

				// a hydratable style rule will have a parsable group, ignore all others
				if (!groupName) continue;

				// create a group sheet if one does not already exist
				if (!groupSheet) groupSheet = { sheet, reset, rules: {}, toString };

				// add the group to the group sheet
				groupSheet.rules[groupName] = { group, index, cache: new Set(cache) };
			}

			// if a hydratable stylesheet is found, stop looking
			if (groupSheet) break;
		}

		// if no hydratable stylesheet is found
		if (!groupSheet) {
			const createCSSMediaRule = (
				/** @type {string} */ sourceCssText: string,
				type: number | string,
			): CSSMediaRule => {
				return {
					type,
					cssRules: [],
					insertRule(cssText, index) {
						this.cssRules.splice(
							index,
							0,
							createCSSMediaRule(
								cssText,
								{
									import: 3,
									undefined: 1,
								}[
									String((cssText.toLowerCase().match(/^@([a-z]+)/) || [])[1])
								] || 4,
							),
						);
					},
					get cssText() {
						return sourceCssText.startsWith('@layer')
							? `${sourceCssText.replace('{}', '')}{${([] as CSSRule[]).map
									.call(this.cssRules, (cssRule) => cssRule.cssText)
									.join('')}}`
							: sourceCssText;
					},
				};
			};

			const createSheet = () => {
				if (typeof window !== 'undefined' && !!root) {
					const styleEl = document.createElement('style');
					const nonce = getNonce();
					if (nonce) {
						styleEl.setAttribute('nonce', nonce);
					}
					// @ts-expect-error I don't want to check the type of 'root'
					return (root.head || root).appendChild(styleEl).sheet;
				}
				return createCSSMediaRule('', 'text/css');
			};

			groupSheet = {
				sheet: createSheet(),
				rules: {},
				reset,
				toString,
			};
		}

		const { sheet, rules } = groupSheet;
		for (let i = names.length - 1; i >= 0; --i) {
			// name of group on current index
			const name = names[i];
			if (name && !rules[name]) {
				// name of prev group
				const prevName = names[i + 1];
				// get the index of that prev group or else get the length of the whole sheet
				const index =
					prevName && rules[prevName]
						? rules[prevName]?.index ?? sheet.cssRules.length
						: sheet.cssRules.length;
				// insert the grouping & the sxs rule
				sheet.insertRule(`@layer ${name}{}`, index);
				sheet.insertRule(`--sxs{--sxs:${i}}`, index);
				// add the group to the group sheet
				rules[name] = {
					group: sheet.cssRules[index + 1]!,
					index,
					cache: new Set([i]),
				};
			}
			addApplyToGroup(rules[name!]!);
		}
	};

	reset();

	return groupSheet!;
};

const addApplyToGroup = (group: RuleGroup) => {
	const groupingRule = group.group;

	let index = groupingRule?.cssRules?.length;

	group.apply = (cssText) => {
		try {
			groupingRule.insertRule(cssText, index);

			++index;
		} catch (__) {
			// do nothing and continue
		}
	};
};

/** Pending rules for injection */
const $pr = Symbol();

export type Injector = {
	(): null;
	rules: Record<string, { apply: (rule: string) => void }>;
	[$pr]: [string, string][];
};

/**
 * When a stitches component is extending some other random react component,
 * it’s gonna create a react component (Injector) using this function and then render it after the children,
 * this way, we would force the styles of the wrapper to be injected after the wrapped component
 */
export const createRulesInjectionDeferrer = (globalSheet: SheetGroup) => {
	// the injection deferrer
	const injector: Injector = () => {
		for (let i = 0; i < injector[$pr].length; i++) {
			const [sheet, cssString] = injector[$pr][i]!;
			globalSheet.rules[sheet]?.apply?.(cssString);
		}
		injector[$pr] = [];
		return null;
	};
	// private prop to store pending rules
	injector[$pr] = [] as [string, string][];
	// mocking the rules.apply api used on the sheet
	injector.rules = {};
	// creating the apply methods under rules[something]
	for (const sheetName of names) {
		injector.rules[sheetName] = {
			apply: (rule) => injector[$pr].push([sheetName, rule]),
		};
	}
	return injector;
};
