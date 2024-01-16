import { createStitches } from '@jujst/stitches/react';
import * as React from 'react';
import * as renderer from 'react-test-renderer';
import { describe, expect, test } from 'vitest';

describe('Issue #671', () => {
  {
    const { styled, getCssText } = createStitches();

    const StyledBase = styled('div', { color: 'red' });
    const Base: React.FC = (props) =>
      React.createElement(StyledBase, { ...props });
    const Bar = styled(Base, { color: 'blue' });

    const App = () => {
      return React.createElement(
        'div',
        null,
        // children
        React.createElement(Bar, {}),
      );
    };

    renderer.act(() => {
      renderer.create(React.createElement(App));
    });

    test('a stitches component extending a react component will inject the styles in the correct order', () => {
      expect(getCssText()).toBe(
        '--sxs{--sxs:2 c-kydkiA c-gmqXFB}@layer styled{.c-gmqXFB{color:red}.c-kydkiA{color:blue}}',
      );
    });
  }
});
