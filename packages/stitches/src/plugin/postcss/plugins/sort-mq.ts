/*
MIT License

Copyright (c) 2023 Segun Adebayo

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

import type { Container, TransformCallback } from 'postcss';
import { P, match } from 'ts-pattern';
import { sortAtRules } from './sort-at-rules';

export default function sortMediaQueries(): TransformCallback {
	const inner = (root: Container) => {
		root.nodes.sort((a, b) => {
			return match({ a, b })
				.with(
					{
						a: { type: 'atrule', name: 'media' },
						b: { type: 'atrule', name: 'media' },
					},
					({ a, b }) => {
						return sortAtRules(a.params, b.params);
					},
				)
				.with({ a: { type: 'atrule', name: 'media' }, b: P.any }, () => {
					return 1;
				})
				.with({ a: P.any, b: { type: 'atrule', name: 'media' } }, () => {
					return -1;
				})
				.otherwise(() => {
					return 0;
				});
		});

		// recursive sort
		for (const node of root.nodes) {
			if ('nodes' in node) {
				inner(node);
			}
		}
	};

	return inner;
}

sortMediaQueries.postcssPlugin = 'panda-sort-mq';
