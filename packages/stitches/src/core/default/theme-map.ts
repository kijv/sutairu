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

import { Prettify } from '../../plugin/types';

const borderStyles = 'borderStyles';
const borderWidths = 'borderWidths';
const colors = 'colors';
const fonts = 'fonts';
const fontSizes = 'fontSizes';
const fontWeights = 'fontWeights';
const letterSpacings = 'letterSpacings';
const lineHeights = 'lineHeights';
const radii = 'radii';
const shadows = 'shadows';
const sizes = 'sizes';
const space = 'space';
const transitions = 'transitions';
const zIndices = 'zIndices';

/** Map of CSS properties to token scales. */
const _defaultThemeMap = {
	gap: space,
	gridGap: space,
	columnGap: space,
	gridColumnGap: space,
	rowGap: space,
	gridRowGap: space,
	inset: space,
	insetBlock: space,
	insetBlockEnd: space,
	insetBlockStart: space,
	insetInline: space,
	insetInlineEnd: space,
	insetInlineStart: space,
	margin: space,
	marginTop: space,
	marginRight: space,
	marginBottom: space,
	marginLeft: space,
	marginBlock: space,
	marginBlockEnd: space,
	marginBlockStart: space,
	marginInline: space,
	marginInlineEnd: space,
	marginInlineStart: space,
	padding: space,
	paddingTop: space,
	paddingRight: space,
	paddingBottom: space,
	paddingLeft: space,
	paddingBlock: space,
	paddingBlockEnd: space,
	paddingBlockStart: space,
	paddingInline: space,
	paddingInlineEnd: space,
	paddingInlineStart: space,
	top: space,
	right: space,
	bottom: space,
	left: space,
	scrollMargin: space,
	scrollMarginTop: space,
	scrollMarginRight: space,
	scrollMarginBottom: space,
	scrollMarginLeft: space,
	scrollMarginX: space,
	scrollMarginY: space,
	scrollMarginBlock: space,
	scrollMarginBlockEnd: space,
	scrollMarginBlockStart: space,
	scrollMarginInline: space,
	scrollMarginInlineEnd: space,
	scrollMarginInlineStart: space,
	scrollPadding: space,
	scrollPaddingTop: space,
	scrollPaddingRight: space,
	scrollPaddingBottom: space,
	scrollPaddingLeft: space,
	scrollPaddingX: space,
	scrollPaddingY: space,
	scrollPaddingBlock: space,
	scrollPaddingBlockEnd: space,
	scrollPaddingBlockStart: space,
	scrollPaddingInline: space,
	scrollPaddingInlineEnd: space,
	scrollPaddingInlineStart: space,

	fontSize: fontSizes,

	accentColor: colors,
	background: colors,
	backgroundColor: colors,
	backgroundImage: colors,
	borderImage: colors,
	border: colors,
	borderBlock: colors,
	borderBlockEnd: colors,
	borderBlockStart: colors,
	borderBlockEndColor: colors,
	borderBlockStartColor: colors,
	borderBottom: colors,
	borderBottomColor: colors,
	borderColor: colors,
	borderInline: colors,
	borderInlineEnd: colors,
	borderInlineStart: colors,
	borderInlineEndColor: colors,
	borderInlineStartColor: colors,
	borderLeft: colors,
	borderLeftColor: colors,
	borderRight: colors,
	borderRightColor: colors,
	borderTop: colors,
	borderTopColor: colors,
	caretColor: colors,
	color: colors,
	columnRuleColor: colors,
	fill: colors,
	outline: colors,
	outlineColor: colors,
	stroke: colors,
	textDecorationColor: colors,

	fontFamily: fonts,

	fontWeight: fontWeights,

	lineHeight: lineHeights,

	letterSpacing: letterSpacings,

	blockSize: sizes,
	minBlockSize: sizes,
	maxBlockSize: sizes,
	inlineSize: sizes,
	minInlineSize: sizes,
	maxInlineSize: sizes,
	width: sizes,
	minWidth: sizes,
	maxWidth: sizes,
	height: sizes,
	minHeight: sizes,
	maxHeight: sizes,
	flexBasis: sizes,
	gridTemplateColumns: sizes,
	gridTemplateRows: sizes,

	borderWidth: borderWidths,
	borderTopWidth: borderWidths,
	borderRightWidth: borderWidths,
	borderBottomWidth: borderWidths,
	borderLeftWidth: borderWidths,

	borderStyle: borderStyles,
	borderTopStyle: borderStyles,
	borderRightStyle: borderStyles,
	borderBottomStyle: borderStyles,
	borderLeftStyle: borderStyles,

	borderRadius: radii,
	borderTopLeftRadius: radii,
	borderTopRightRadius: radii,
	borderBottomRightRadius: radii,
	borderBottomLeftRadius: radii,

	boxShadow: shadows,
	textShadow: shadows,

	transition: transitions,

	zIndex: zIndices,
} as const;

type Writeable<T> = Prettify<{ -readonly [P in keyof T]: T[P] }>;
export type DefaultThemeMap = Writeable<typeof _defaultThemeMap>;

export const defaultThemeMap = _defaultThemeMap as DefaultThemeMap;
