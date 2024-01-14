import { toTailDashed } from './tail-dashed';

/** Returns a declaration value with transformed token values. */
export const toTokenizedValue = (
	value: string,
	prefix: string,
	scale: string,
) =>
	value.replace(
		/([+-])?((?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?)?(\$|--)([$\w-]+)/g,
		($0, direction, multiplier, separator, token) =>
			(separator == '$') == !!multiplier
				? $0
				: (direction || separator == '--' ? 'calc(' : '') +
				  ('var(--' +
						(separator === '$'
							? toTailDashed(prefix) +
							  (!token.includes('$') ? toTailDashed(scale) : '') +
							  token.replace(/\$/g, '-')
							: token) +
						')' +
						(direction || separator == '--'
							? '*' + (direction || '') + (multiplier || '1') + ')'
							: '')),
	);
