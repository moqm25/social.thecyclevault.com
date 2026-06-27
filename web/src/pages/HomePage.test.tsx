import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../app/ThemeProvider';
import HomePage from '../pages/HomePage';

function renderWithProviders(ui: React.ReactNode) {
  return render(
    <ThemeProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>,
  );
}

describe('HomePage', () => {
  it('renders the brand hero', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/your cycle/i)).toBeInTheDocument();
  });

  it('lists all six seed communities', () => {
    renderWithProviders(<HomePage />);
    for (const name of [
      'General',
      'Cycle Questions',
      'Symptoms',
      'Privacy & App Feedback',
      'Educational Discussion',
      'Support',
    ]) {
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });
});
