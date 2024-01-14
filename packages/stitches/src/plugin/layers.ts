/*
MIT License

Copyright (c) 2021-PRESENT Anthony Fu <https://github.com/antfu>

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

export const VIRTUAL_ENTRY_ALIAS = [
  /^(?:virtual:)?stitches(?::(.+))?\.css(\?.*)?$/,
];
export const LAYER_MARK_ALL = '__ALL__';

export const RESOLVED_ID_WITH_QUERY_RE =
  /[\/\\]__jujst_stitches(?:(_.*?))?\.css(\?.*)?$/;
export const RESOLVED_ID_RE = /[\/\\]__jujst_stitches(?:(_.*?))?\.css$/;

export function resolveId(id: string) {
  if (id.match(RESOLVED_ID_WITH_QUERY_RE)) return id;

  for (const alias of VIRTUAL_ENTRY_ALIAS) {
    const match = id.match(alias);
    if (match) {
      return match[1]
        ? `/__jujst_stitches_${match[1]}.css`
        : '/__jujst_stitches.css';
    }
  }
}

export function resolveLayer(id: string) {
  const match = id.match(RESOLVED_ID_RE);
  if (match) return match[1] || LAYER_MARK_ALL;
}

export const LAYER_PLACEHOLDER_RE =
  /(\\?")?#--jujst-stitches--\s*{\s*layer\s*:\s*(.+?);?\s*}/g;
export function getLayerPlaceholder(layer: string) {
  return `#--jujstv-stitches--{layer:${layer}}`;
}

export const HASH_PLACEHOLDER_RE =
  /#--jujst-stitches-hash--\s*{\s*content\s*:\s*\\*"(.+?)\\*";?\s*}/g;
export function getHashPlaceholder(hash: string) {
  return `#--jujst-stitches-hash--{content:"${hash}"}`;
}
