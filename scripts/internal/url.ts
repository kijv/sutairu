import { fileURLToPath, pathToFileURL } from 'node:url';

export default class URL extends globalThis.URL {
  to(...segments: string[]) {
    return segments.reduce((url: URL, segment) => new URL(segment, url), this);
  }

  includes(searchString: string, position = 0) {
    return this.href.includes(searchString, position);
  }

  endsWith(searchString: string, length = this.href.length) {
    return this.href.endsWith(searchString, length);
  }

  get dir() {
    return new URL(`${this.href}/`);
  }

  get ospathname() {
    return fileURLToPath(this);
  }

  static from(segment: string | globalThis.URL, ...segments: string[]) {
    return (
      /^file:/.test(segment as string)
        ? new URL(segment)
        : new URL(pathToFileURL(segment as string))
    ).to(...segments);
  }
}
