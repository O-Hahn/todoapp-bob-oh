import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../src/context/ThemeContext.js';

const TestComponent = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="is-dark">{isDark ? 'yes' : 'no'}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

describe('ThemeContext & Theming', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('provides default theme and toggles between white and g100', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const themeVal = screen.getByTestId('theme-val');
    expect(themeVal.textContent).toMatch(/white|g100/);

    const initialTheme = themeVal.textContent;
    const button = screen.getByText('Toggle');
    fireEvent.click(button);

    const newTheme = screen.getByTestId('theme-val').textContent;
    expect(newTheme).not.toBe(initialTheme);
    expect(['white', 'g100']).toContain(newTheme);
  });
});
