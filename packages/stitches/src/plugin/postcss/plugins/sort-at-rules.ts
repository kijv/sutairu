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

const minMaxWidth =
	/(!?\(\s*min(-device-)?-width)(.|\n)+\(\s*max(-device)?-width/i;
const minWidth = /\(\s*min(-device)?-width/i;
const maxMinWidth =
	/(!?\(\s*max(-device)?-width)(.|\n)+\(\s*min(-device)?-width/i;
const maxWidth = /\(\s*max(-device)?-width/i;

const isMinWidth = _testQuery(minMaxWidth, maxMinWidth, minWidth);
const isMaxWidth = _testQuery(maxMinWidth, minMaxWidth, maxWidth);

const minMaxHeight =
	/(!?\(\s*min(-device)?-height)(.|\n)+\(\s*max(-device)?-height/i;
const minHeight = /\(\s*min(-device)?-height/i;
const maxMinHeight =
	/(!?\(\s*max(-device)?-height)(.|\n)+\(\s*min(-device)?-height/i;
const maxHeight = /\(\s*max(-device)?-height/i;

const isMinHeight = _testQuery(minMaxHeight, maxMinHeight, minHeight);
const isMaxHeight = _testQuery(maxMinHeight, minMaxHeight, maxHeight);

const isPrint = /print/i;
const isPrintOnly = /^print$/i;

const maxValue = Number.MAX_VALUE;

/**
 * Obtain the length of the media request in pixels.
 * Copy from original source `function inspectLength (length)`
 */
function getQueryLength(query: string) {
	let length = /(-?\d*\.?\d+)(ch|em|ex|px|rem)/.exec(query);

	if (length === null && (isMinWidth(query) || isMinHeight(query))) {
		length = /(\d)/.exec(query);
	}

	//@ts-expect-error - will fix later
	if (length === '0') {
		return 0;
	}

	if (length === null) {
		return maxValue;
	}

	let number: number | string = length[1] as number | string;
	const unit = length[2];

	switch (unit) {
		case 'ch':
			number = parseFloat(number.toString()) * 8.8984375;
			break;

		case 'em':
		case 'rem':
			number = parseFloat(number.toString()) * 16;
			break;

		case 'ex':
			number = parseFloat(number.toString()) * 8.296875;
			break;

		case 'px':
			number = parseFloat(number.toString());
			break;
	}

	return +number;
}

/**
 * Wrapper for creating test functions
 * @private
 * @param {RegExp} doubleTestTrue
 * @param {RegExp} doubleTestFalse
 * @param {RegExp} singleTest
 * @return {Function}
 */
function _testQuery(
	doubleTestTrue: RegExp,
	doubleTestFalse: RegExp,
	singleTest: RegExp,
) {
	/**
	 * @param {string} query
	 * @return {boolean}
	 */
	return (query: string) => {
		if (doubleTestTrue.test(query)) {
			return true;
		}
		if (doubleTestFalse.test(query)) {
			return false;
		}
		return singleTest.test(query);
	};
}

/**
 * @private
 * @param {string} a
 * @param {string} b
 * @return {number|null}
 */
function _testIsPrint(a: string, b: string) {
	const isPrintA = isPrint.test(a);
	const isPrintOnlyA = isPrintOnly.test(a);

	const isPrintB = isPrint.test(b);
	const isPrintOnlyB = isPrintOnly.test(b);

	if (isPrintA && isPrintB) {
		if (!isPrintOnlyA && isPrintOnlyB) {
			return 1;
		}
		if (isPrintOnlyA && !isPrintOnlyB) {
			return -1;
		}
		return a.localeCompare(b);
	}
	if (isPrintA) {
		return 1;
	}
	if (isPrintB) {
		return -1;
	}

	return null;
}

function createSort(config: { unitlessMqAlwaysFirst?: boolean } = {}) {
	const { unitlessMqAlwaysFirst } = config;

	return function sortCSSmq(a: string, b: string) {
		const testIsPrint = _testIsPrint(a, b);
		if (testIsPrint !== null) {
			return testIsPrint;
		}

		const minA = isMinWidth(a) || isMinHeight(a);
		const maxA = isMaxWidth(a) || isMaxHeight(a);

		const minB = isMinWidth(b) || isMinHeight(b);
		const maxB = isMaxWidth(b) || isMaxHeight(b);

		if (unitlessMqAlwaysFirst && ((!minA && !maxA) || (!minB && !maxB))) {
			if (!minA && !maxA && !minB && !maxB) {
				return a.localeCompare(b);
			}
			return !minB && !maxB ? 1 : -1;
		}
		if (minA && maxB) {
			return -1;
		}
		if (maxA && minB) {
			return 1;
		}

		const lengthA = getQueryLength(a);
		const lengthB = getQueryLength(b);

		if (lengthA === maxValue && lengthB === maxValue) {
			return a.localeCompare(b);
		}
		if (lengthA === maxValue) {
			return 1;
		}
		if (lengthB === maxValue) {
			return -1;
		}

		if (lengthA > lengthB) {
			if (maxA) {
				return -1;
			}
			return 1;
		}

		if (lengthA < lengthB) {
			if (maxA) {
				return 1;
			}
			return -1;
		}

		return a.localeCompare(b);
	};
}

export const sortAtRules = createSort();
