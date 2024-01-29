/** Returns selectors resolved from parent selectors and nested selectors. */
export const toResolvedSelectors = (
  /** @Parent selectors (e.g. `["a", "button"]`). */
  parentSelectors: string[],
  /** Nested selectors (e.g. `["&:hover", "&:focus"]`). */
  nestedSelectors: string[],
) =>
  parentSelectors.length
    ? parentSelectors.reduce((resolvedSelectors, parentSelector) => {
        resolvedSelectors.push(
          ...nestedSelectors.map((selector) =>
            selector.includes('&')
              ? selector.replace(
                  /&/g,
                  /[ +>|~]/.test(parentSelector) && /&.*&/.test(selector)
                    ? `:is(${parentSelector})`
                    : parentSelector,
                )
              : `${parentSelector} ${selector}`,
          ),
        );

        return resolvedSelectors;
      }, [] as string[])
    : nestedSelectors;
