/*
MIT License

Copyright (c) 2022 WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { toCssRules } from '../convert/css-rules';
import { toHash } from '../convert/hash';
import { toTailDashed } from '../convert/tail-dashed';
import { SheetGroup, createRulesInjectionDeferrer } from '../sheet';
import Stitches from '../types/stitches';
import { createMemo } from '../utils/create-memo';
import { define } from '../utils/define';
import { hasNames } from '../utils/has-names';
import { hasOwn } from '../utils/has-own';
import { internal } from '../utils/internal';

const createCssFunctionMap = createMemo();

/** Returns a function that applies component styles. */
export const createCssFunction = (
  config: Stitches['config'],
  sheet: SheetGroup,
) =>
  createCssFunctionMap(config, () => {
    const _css = (args: any[], componentConfig = {}) => {
      const internals = {
        type: null,
        composers: new Set(),
      } as {
        type: any;
        composers: Set<any>;
      };

      for (const arg of args) {
        // skip any void argument
        if (arg == null) continue;

        // conditionally extend the component
        if (arg[internal]) {
          if (internals.type == null) internals.type = arg[internal].type;

          for (const composer of arg[internal].composers) {
            internals.composers.add(composer);
          }
        }

        // otherwise, conditionally define the component type
        else if (arg.constructor !== Object || arg.$$typeof) {
          if (internals.type == null) internals.type = arg;
        }

        // otherwise, add a new composer to this component
        else {
          internals.composers.add(createComposer(arg, config, componentConfig));
        }
      }

      if (internals.type == null) internals.type = 'span';
      if (!internals.composers.size)
        internals.composers.add(['PJLV', {}, [], [], {}, []]);

      return createRenderer(config, internals, sheet, componentConfig);
    };

    const css = (...args: any[]) => _css(args);

    css.withConfig =
      (componentConfig: any) =>
      (...args: any[]) =>
        _css(args, componentConfig);

    return css;
  });

/** Creates a composer from a configuration object. */
const createComposer = (
  {
    variants: initSingularVariants,
    compoundVariants: initCompoundVariants,
    defaultVariants: initDefaultVariants,
    ...style
  }: any,
  config: Stitches['config'],
  {
    componentId,
    displayName,
  }: {
    componentId?: string;
    displayName?: string;
  },
) => {
  /** Composer Unique Identifier. @see `{CONFIG_PREFIX}-?c-{STYLE_HASH}` */
  const hash = componentId || toHash(style);
  const componentNamePrefix = displayName ? `c-${displayName}` : 'c';
  const className = `${toTailDashed(
    config.prefix,
  )}${componentNamePrefix}-${hash}`;

  const singularVariants = [];

  const compoundVariants = [];

  const prefilledVariants = Object.create(null);

  const undefinedVariants = [];

  for (const variantName in initDefaultVariants) {
    prefilledVariants[variantName] = String(initDefaultVariants[variantName]);
  }

  // add singular variants
  if (typeof initSingularVariants === 'object' && initSingularVariants) {
    for (const name in initSingularVariants) {
      if (!hasOwn(prefilledVariants, name))
        prefilledVariants[name] = 'undefined';

      const variantPairs = initSingularVariants[name];

      for (const pair in variantPairs) {
        const vMatch = { [name]: String(pair) };

        if (String(pair) === 'undefined') undefinedVariants.push(name);

        const vStyle = variantPairs[pair];

        const variant = [vMatch, vStyle, !hasNames(vStyle)];

        singularVariants.push(variant);
      }
    }
  }

  // add compound variants
  if (typeof initCompoundVariants === 'object' && initCompoundVariants) {
    for (const compoundVariant of initCompoundVariants) {
      let { css: vStyle, ...vMatch } = compoundVariant;

      vStyle = (typeof vStyle === 'object' && vStyle) || {};

      // serialize all compound variant pairs
      for (const name in vMatch) vMatch[name] = String(vMatch[name]);

      const variant = [vMatch, vStyle, !hasNames(vStyle)];

      compoundVariants.push(variant);
    }
  }

  return [
    className,
    style,
    singularVariants,
    compoundVariants,
    prefilledVariants,
    undefinedVariants,
  ];
};

const createRenderer = (
  config: Stitches['config'],
  internals: {
    type: any;
    composers: Set<any>;
  },
  sheet: SheetGroup,
  {
    shouldForwardStitchesProp,
  }: {
    shouldForwardStitchesProp?: (prop: string) => boolean;
  },
) => {
  const [baseClassName, baseClassNames, prefilledVariants, undefinedVariants] =
    getPreparedDataFromComposers(internals.composers);

  const deferredInjector =
    typeof internals.type === 'function' || !!internals.type?.$$typeof
      ? createRulesInjectionDeferrer(sheet)
      : undefined;
  const injectionTarget = (deferredInjector || sheet)?.rules;

  const selector = `.${baseClassName}${
    baseClassNames.length > 1
      ? `:where(.${baseClassNames.slice(1).join('.')})`
      : ''
  }`;

  const render = (props: Record<string, unknown> = {}) => {
    props = (typeof props === 'object' && props) || {};

    // 1. we cannot mutate `props`
    // 2. we delete variant props
    // 3. we delete `css` prop
    // therefore: we must create a new props & css variables
    const { ...forwardProps } = props;

    const variantProps: Record<string, unknown> = {};

    for (const name in prefilledVariants) {
      if (name in props) {
        if (!shouldForwardStitchesProp?.(name)) delete forwardProps[name];
        let data = props[name];

        if (typeof data === 'object' && data) {
          variantProps[name] = {
            '@initial': prefilledVariants[name],
            ...data,
          };
        } else {
          data = String(data);

          variantProps[name] =
            data === 'undefined' && !undefinedVariants.has(name)
              ? prefilledVariants[name]
              : data;
        }
      } else {
        variantProps[name] = prefilledVariants[name];
      }
    }

    const classSet = new Set([...baseClassNames]);

    // 1. builds up the variants (fills in defaults, calculates @initial on responsive, etc.)
    // 2. iterates composers
    // 2.1. add their base class
    // 2.2. iterate their variants, add their variant classes
    // 2.2.1. orders regular variants before responsive variants
    // 2.3. iterate their compound variants, add their compound variant classes

    for (const [
      composerBaseClass,
      composerBaseStyle,
      singularVariants,
      compoundVariants,
    ] of internals.composers) {
      if (!sheet.rules.styled?.cache.has(composerBaseClass)) {
        sheet.rules.styled?.cache.add(composerBaseClass);

        toCssRules(
          composerBaseStyle,
          [`.${composerBaseClass}`],
          [],
          config,
          (cssText) => {
            injectionTarget.styled?.apply?.(cssText);
          },
        );
      }

      const singularVariantsToAdd = getTargetVariantsToAdd(
        singularVariants,
        variantProps,
        config.media,
      );
      const compoundVariantsToAdd = getTargetVariantsToAdd(
        compoundVariants,
        variantProps,
        config.media,
        true,
      );

      for (const variantToAdd of singularVariantsToAdd) {
        if (variantToAdd === undefined) continue;

        for (const [vClass, vStyle, isResponsive] of variantToAdd) {
          const variantClassName = `${composerBaseClass}-${toHash(
            vStyle,
          )}-${vClass}`;

          classSet.add(variantClassName);

          const layerCache = (
            isResponsive ? sheet.rules.resonevar : sheet.rules.onevar
          )?.cache;
          /*
           * make sure that normal variants are injected before responsive ones
           * @see {@link https://github.com/stitchesjs/stitches/issues/737|github}
           */
          const targetInjectionLayer = isResponsive
            ? injectionTarget.resonevar
            : injectionTarget.onevar;

          if (!layerCache?.has(variantClassName)) {
            layerCache?.add(variantClassName);
            toCssRules(
              vStyle,
              [`.${variantClassName}`],
              [],
              config,
              (cssText) => {
                targetInjectionLayer?.apply?.(cssText);
              },
            );
          }
        }
      }

      for (const variantToAdd of compoundVariantsToAdd) {
        if (variantToAdd === undefined) continue;

        for (const [vClass, vStyle] of variantToAdd) {
          const variantClassName = `${composerBaseClass}-${toHash(
            vStyle,
          )}-${vClass}`;

          classSet.add(variantClassName);

          if (!sheet.rules.allvar?.cache.has(variantClassName)) {
            sheet.rules.allvar?.cache.add(variantClassName);

            toCssRules(
              vStyle,
              [`.${variantClassName}`],
              [],
              config,
              (cssText) => {
                injectionTarget.allvar?.apply?.(cssText);
              },
            );
          }
        }
      }
    }

    // apply css property styles
    const css = forwardProps.css;
    if (typeof css === 'object' && css) {
      if (!shouldForwardStitchesProp?.('css')) forwardProps.css = undefined;
      /** @type {string} Inline Class Unique Identifier. @see `{COMPOSER_UUID}-i{VARIANT_UUID}-css` */
      const iClass = `${baseClassName}-i${toHash(css)}-css`;

      classSet.add(iClass);

      if (!sheet.rules.inline?.cache.has(iClass)) {
        sheet.rules.inline?.cache.add(iClass);

        toCssRules(css, [`.${iClass}`], [], config, (cssText) => {
          injectionTarget.inline?.apply?.(cssText);
        });
      }
    }

    for (const propClassName of String(props.className || '')
      .trim()
      .split(/\s+/)) {
      if (propClassName) classSet.add(propClassName);
    }

    forwardProps.className = [...classSet].join(' ');
    const renderedClassName = forwardProps.className;

    const renderedToString = () => renderedClassName;

    return {
      type: internals.type,
      className: renderedClassName,
      selector,
      props: forwardProps,
      toString: renderedToString,
      deferredInjector,
    };
  };

  // biome-ignore lint/suspicious/noShadowRestrictedNames: used for embedding within a template literal
  const toString = () => {
    if (!sheet.rules.styled?.cache.has(baseClassName)) render();

    return baseClassName;
  };

  return define(render, {
    className: baseClassName,
    selector,
    [internal]: internals,
    toString,
  });
};

/** Returns useful data that can be known before rendering. */
const getPreparedDataFromComposers = (composers: Set<any>) => {
  /** Class name of the first composer. */
  let baseClassName = '';

  /** @type {string[]} Combined class names for all composers. */
  const baseClassNames = [];

  /** Combined variant pairings for all composers. */
  const combinedPrefilledVariants: Record<string, unknown> = {};

  /** List of variant names that can have an "undefined" pairing. */
  const combinedUndefinedVariants = [];

  for (const [
    className,
    ,
    ,
    ,
    prefilledVariants,
    undefinedVariants,
  ] of composers) {
    if (baseClassName === '') baseClassName = className;

    baseClassNames.push(className);

    combinedUndefinedVariants.push(...undefinedVariants);

    for (const name in prefilledVariants) {
      const data = prefilledVariants[name];
      if (
        combinedPrefilledVariants[name] === undefined ||
        data !== 'undefined' ||
        undefinedVariants.includes(data)
      )
        combinedPrefilledVariants[name] = data;
    }
  }

  const preparedData = [
    baseClassName,
    baseClassNames,
    combinedPrefilledVariants,
    new Set(combinedUndefinedVariants),
  ] as const;

  return preparedData;
};

const getTargetVariantsToAdd = (
  _targetVariants: [any, Record<string, any>, any][],
  variantProps: any,
  media: any,
  isCompoundVariant = false,
) => {
  const targetVariantsToAdd: [string, Record<string, any>, boolean][][] = [];

  targetVariants: for (let [vMatch, vStyle, vEmpty] of _targetVariants) {
    // skip empty variants
    if (vEmpty) continue;

    /** Position the variant should be inserted into. */
    let vOrder = 0;

    let vName;

    let isResponsive = false;
    for (vName in vMatch) {
      const vPair = vMatch[vName];

      const pPair = variantProps[vName];

      // exact matches
      if (pPair === vPair) continue;

      if (typeof pPair === 'object' && pPair) {
        /**  Whether the responsive variant is matched. */
        let didMatch: boolean;

        let qOrder = 0;
        // media queries matching the same variant
        let matchedQueries;
        for (const query in pPair) {
          if (vPair === String(pPair[query])) {
            if (query !== '@initial') {
              // check if the cleanQuery is in the media config and then we push the resulting media query to the matchedQueries array,
              // if not, we remove the @media from the beginning and push it to the matched queries which then will be resolved a few lines down
              // when we finish working on this variant and want wrap the vStyles with the matchedQueries
              const cleanQuery = query.slice(1);
              matchedQueries = matchedQueries || ([] as string[]);
              matchedQueries.push(
                cleanQuery in media
                  ? media[cleanQuery]
                  : query.replace(/^@media ?/, ''),
              );
              isResponsive = true;
            }

            vOrder += qOrder;
            didMatch = true;
          }

          ++qOrder;
        }

        // biome-ignore lint/complexity/useOptionalChain:
        if (matchedQueries && matchedQueries.length) {
          vStyle = {
            [`@media ${matchedQueries.join(', ')}`]: vStyle,
          };
        }

        // @ts-expect-error
        if (!didMatch) continue targetVariants;
      }

      // non-matches
      else continue targetVariants;
    }
    targetVariantsToAdd[vOrder] = targetVariantsToAdd[vOrder] || [];

    targetVariantsToAdd[vOrder]?.push([
      isCompoundVariant ? 'cv' : `${vName}-${vName?.[vName]}`,
      vStyle,
      isResponsive,
    ]);
  }

  return targetVariantsToAdd;
};
