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

import React from 'react';
import { createCssFunction } from '../../../core/src/features/css';
import type { SheetGroup } from '../../../core/src/sheet';
import { createMemo } from '../../../core/src/utils/create-memo';
import { internal } from '../../../core/src/utils/internal';
import type Stitches from '../../types/stitches';

const createCssFunctionMap = createMemo();

/** Returns a function that applies component styles. */
export const createStyledFunction = (
  config: Stitches['config'],
  sheet: SheetGroup,
) =>
  createCssFunctionMap(config, () => {
    const cssFunction = createCssFunction(config, sheet);

    const _styled: (...args: any[]) => unknown = (
      args,
      css = cssFunction,
      { displayName, shouldForwardStitchesProp } = {},
    ) => {
      const cssComponent = css(...args);
      const DefaultType = cssComponent[internal].type;
      const shouldForwardAs = shouldForwardStitchesProp?.('as');

      const styledComponent = React.forwardRef(
        (props: Record<string, unknown>, ref) => {
          const Type = props?.as && !shouldForwardAs ? props?.as : DefaultType;

          const { props: forwardProps, deferredInjector } = cssComponent(props);

          if (!shouldForwardAs) {
            forwardProps.as = undefined;
          }

          forwardProps.ref = ref;

          if (deferredInjector) {
            return React.createElement(
              React.Fragment,
              null,
              React.createElement(Type, forwardProps),
              React.createElement(deferredInjector, null),
            );
          }

          return React.createElement(Type, forwardProps);
        },
      );

      // biome-ignore lint/suspicious/noShadowRestrictedNames: Need for including in template literals
      const toString = () => cssComponent.selector;

      // @ts-expect-error Stitches specfic API
      styledComponent.className = cssComponent.className;
      styledComponent.displayName =
        displayName ||
        `Styled.${
          DefaultType?.displayName || DefaultType?.name || DefaultType
        }`;
      // @ts-expect-error Stitches specfic API
      styledComponent.selector = cssComponent.selector;
      styledComponent.toString = toString;
      // @ts-expect-error Stitches specfic API
      styledComponent[internal] = cssComponent[internal];

      return styledComponent;
    };

    const styled = (...args: unknown[]) => _styled(args);

    styled.withConfig =
      (componentConfig: unknown) =>
      (...args: unknown[]) => {
        const cssWithConfig = cssFunction.withConfig(componentConfig);
        return _styled(args, cssWithConfig, componentConfig);
      };

    return styled;
  });
