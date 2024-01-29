// biome-ignore lint/correctness/noEmptyCharacterClassInRegex: This is neccessary for the regex to work.
const mqunit = /([\d.]+)([^]*)/;

/** Returns a media query with polyfilled ranges. */
export const toResolvedMediaQueryRanges = (media: string) =>
  media.replace(
    /\(\s*([\w-]+)\s*(=|<|<=|>|>=)\s*([\w-]+)\s*(?:(<|<=|>|>=)\s*([\w-]+)\s*)?\)/g,
    (
      __: unknown,
      /** 1st param, either the name or value in the query. */
      p1: string,
      /** 1st operator. */
      o1: string,
      /** 2nd param, either the name or value in the query. */
      p2: string,
      /** Optional 2nd operator. */
      o2: string,
      /** Optional 3rd param, always a value in the query.*/
      p3: string,
    ) => {
      /** Whether the first param is a value. */
      const isP1Value = mqunit.test(p1);

      /** Numeric shift applied to a value when an operator is `<` or `>`. */
      const shift = 0.0625 * (isP1Value ? -1 : 1);

      const [name, value] = isP1Value ? [p2, p1] : [p1, p2];

      return `(${
        o1[0] === '=' ? '' : (o1[0] === '>') === isP1Value ? 'max-' : 'min-'
      }${name}:${
        o1[0] !== '=' && o1.length === 1
          ? value.replace(
              mqunit,
              (_, v, u) => Number(v) + shift * (o1 === '>' ? 1 : -1) + u,
            )
          : value
      }${
        o2
          ? `) and (${o2[0] === '>' ? 'min-' : 'max-'}${name}:${
              o2.length === 1
                ? p3.replace(
                    mqunit,
                    (_, v, u) => Number(v) + shift * (o2 === '>' ? -1 : 1) + u,
                  )
                : p3
            }`
          : ''
      })`;
    },
  );
