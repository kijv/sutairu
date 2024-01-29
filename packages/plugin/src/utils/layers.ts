export const VIRTUAL_ENTRY_ALIAS = [
  /^(?:virtual:)?sutairu(?::(.+))?\.css(\?.*)?$/,
];
export const LAYER_MARK_ALL = '__ALL__';

export const RESOLVED_ID_WITH_QUERY_RE =
  /[\/\\]__sutairu(?:(_.*?))?\.css(\?.*)?$/;
export const RESOLVED_ID_RE = /[\/\\]__sutairu(?:(_.*?))?\.css$/;

export function resolveId(id: string) {
  if (id.match(RESOLVED_ID_WITH_QUERY_RE)) return id;

  for (const alias of VIRTUAL_ENTRY_ALIAS) {
    const match = id.match(alias);
    if (match) {
      return match[1] ? `/__sutairu_${match[1]}.css` : '/__sutairu.css';
    }
  }
}

export function resolveLayer(id: string) {
  const match = id.match(RESOLVED_ID_RE);
  if (match) return match[1] || LAYER_MARK_ALL;
}

export const LAYER_PLACEHOLDER_RE =
  /(\\?")?#--sutairu--\s*{\s*layer\s*:\s*(.+?);?\s*}/g;
export function getLayerPlaceholder(layer: string) {
  return `#--sutairu--{layer:${layer}}`;
}

export const HASH_PLACEHOLDER_RE =
  /#--sutairu-hash--\s*{\s*content\s*:\s*\\*"(.+?)\\*";?\s*}/g;
export function getHashPlaceholder(hash: string) {
  return `#--sutairu-hash--{content:"${hash}"}`;
}
