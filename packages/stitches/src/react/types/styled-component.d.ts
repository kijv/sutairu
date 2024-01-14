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

import type * as React from 'react';
import {
	$$StyledComponentMedia,
	$$StyledComponentProps,
	$$StyledComponentType,
	TransformProps,
} from '../../core/types/styled-component';
import type * as Util from '../../core/types/util';

export type IntrinsicElementsKeys = keyof JSX.IntrinsicElements;

/** Returns a new Styled Component. */
export interface StyledComponent<
	Type = 'span',
	Props = {},
	Media = {},
	CSS = {},
> extends React.ForwardRefExoticComponent<
		Util.Assign<
			Type extends IntrinsicElementsKeys | React.ComponentType<any>
				? React.ComponentPropsWithRef<Type>
				: never,
			TransformProps<Props, Media> & { css?: CSS }
		>
	> {
	(
		props: Util.Assign<
			Type extends IntrinsicElementsKeys | React.ComponentType<any>
				? React.ComponentPropsWithRef<Type>
				: {},
			TransformProps<Props, Media> & {
				as?: never;
				css?: CSS;
			}
		>,
	): React.ReactElement | null;

	<
		C extends CSS,
		As extends string | React.ComponentType<any> = Type extends
			| string
			| React.ComponentType<any>
			? Type
			: any,
		InnerProps = Type extends StyledComponent<any, infer IP, any, any>
			? IP
			: {},
	>(
		props: Util.Assign<
			React.ComponentPropsWithRef<
				As extends IntrinsicElementsKeys | React.ComponentType<any> ? As : never
			>,
			TransformProps<Util.Assign<InnerProps, Props>, Media> & {
				as?: As;
				css?: {
					[K in keyof C]: K extends keyof CSS ? CSS[K] : never;
				};
			}
		>,
	): React.ReactElement | null;

	className: string;
	selector: string;

	[$$StyledComponentType]: Type;
	[$$StyledComponentProps]: Props;
	[$$StyledComponentMedia]: Media;
}

/** Returns a new CSS Component. */
export interface CssComponent<Type = 'span', Props = {}, Media = {}, CSS = {}> {
	(
		props?: TransformProps<Props, Media> & {
			css?: CSS;
		} & {
			[name in number | string]: any;
		},
	): string & {
		className: string;
		selector: string;
		props: {};
	};

	className: string;
	selector: string;

	[$$StyledComponentType]: Type;
	[$$StyledComponentProps]: Props;
	[$$StyledComponentMedia]: Media;
}

export type {
	StyledComponentType,
	StyledComponentProps,
} from '../../core/types/styled-component';
