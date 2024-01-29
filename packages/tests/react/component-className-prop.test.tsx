import { createSutairu } from '@sutairu/react';
import { describe, expect, test } from 'vitest';

describe('className prop', () => {
  test('Renders a DOM Element with a class matching the className prop', () => {
    const { styled } = createSutairu();

    const component = styled('div');
    const className = 'myClassName';
    const expression = component.render({ className });

    expect(expression.props.className).toBe(`PJLV ${className}`);
  });

  test('Renders a DOM Element with multiple classes passed as className', () => {
    const { styled } = createSutairu();

    const component = styled('div');
    const className = 'myClassName1 myClassName2 myClassName3';
    const expression = component.render({ className });

    expect(expression.props.className).toBe(`PJLV ${className}`);
  });

  test('Renders a DOM Element withoup adding an undefined class', () => {
    const { styled } = createSutairu();

    const component = styled('div');
    const className = undefined;
    const expression = component.render({ className });

    expect(expression.props.className).not.toBe('undefined');
  });
});
