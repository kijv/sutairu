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

/** Returns a string with the given prefix followed by the given values. */
export type Prefixed<K extends string, T> = `${K}${Extract<
  T,
  boolean | number | string
>}`;

/** Returns an object from the given object assigned with the values of another given object. */
export type Assign<T1 = {}, T2 = {}> = Omit<T1, keyof T2> & T2;

/** Returns a widened value from the given value. */
export type Widen<T> = T extends number
  ? `${T}` | T
  : T extends 'true'
    ? boolean | T
    : T extends 'false'
      ? boolean | T
      : T extends `${number}`
        ? number | T
        : T;

/** Narrowed string. */
export type NarrowString = string & Record<never, never>;

/** Narrowed number or string. */
export type NarrowIndex = (number | string) & Record<never, never>;

/** Narrowed function. */
export type NarrowFunction = (...args: any[]) => unknown;

/** Widened object. */
export type WideObject = {
  [name in number | string]: boolean | number | string | undefined | WideObject;
};
