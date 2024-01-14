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

export interface ScaleValue {
  token: number | string;
  value: number | string;
  scale: string;
  prefix: string;
}

export interface Token<
  /** Token name. */
  NameType extends number | string = string,
  /** Token value. */
  ValueType extends number | string = string,
  /** Token scale. */
  ScaleType extends string | void = void,
  /** Token prefix. */
  PrefixType extends string | void = void,
> extends ScaleValue {
  // biome-ignore lint/suspicious/noMisleadingInstantiator: Copied from @stitches/core
  new (
    name: NameType,
    value: ValueType,
    scale?: ScaleType,
    prefix?: PrefixType,
  ): this;

  /** Name of the token. */
  token: NameType;

  /** Value of the token. */
  value: ValueType;

  /** Category of interface the token applies to. */
  scale: ScaleType extends string ? ScaleType : '';

  /** Prefix added before the serialized custom property. */
  prefix: PrefixType extends string ? PrefixType : '';

  /** Serialized custom property representing the token. */
  variable: `--${this['prefix'] extends ''
    ? ''
    : `${this['prefix']}-`}${this['scale'] extends ''
    ? ''
    : `${this['scale']}-`}${this['token']}`;

  /** Serialized CSS var() representing the token. */
  computedValue: `var(${this['variable']})`;

  /** Returns a serialized CSS var() representing the token. */
  toString(): this['computedValue'];
}
