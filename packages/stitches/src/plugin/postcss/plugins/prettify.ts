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

function prettifyNode(node: Container, indent = 0) {
	node.each?.((child, i) => {
		// skip prettify for sxs
		if ('selector' in child && child.selector === '--sxs') {
			child.selector = '\n--sxs';
		} else if (
			!('selector' in child && child?.selector === '--sxs') &&
			!('prop' in child && child?.prop === '--sxs') &&
			(!child.raws.before ||
				!child.raws.before.trim() ||
				child.raws.before.includes('\n'))
		) {
			child.raws.before = `\n${
				node.type !== 'rule' && i > 0 ? '\n' : ''
			}${'  '.repeat(indent)}`;
			child.raws.after = `\n${'  '.repeat(indent)}`;
		}
		prettifyNode(child as any, indent + 1);
	});
}

export default function prettify(): TransformCallback {
	return (root) => {
		prettifyNode(root);
		if (root.first) {
			root.first.raws.before = '';
		}
	};
}

prettify.postcssPlugin = 'panda-prettify';
