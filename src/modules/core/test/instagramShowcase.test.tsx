import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  TKPL_INSTAGRAM_URL,
  SULTAN_INSTAGRAM_URL,
  NR_SPORTS_INSTAGRAM_URL,
  InstagramFollowSection,
} from '../components/InstagramFollowSection';
import { SocialShowcase, NR_SPORTS_QR_SRC } from '../components/SocialShowcase';

describe('Instagram Channels & Social Showcase', () => {
  it('has the correct Instagram URLs configured', () => {
    expect(NR_SPORTS_INSTAGRAM_URL).toBe(
      'https://www.instagram.com/nr_sports_vempalli?utm_source=qr&exln=MXM4dHE5bDE1M2libA=='
    );
    expect(SULTAN_INSTAGRAM_URL).toContain('sultansports_kadapa');
    expect(TKPL_INSTAGRAM_URL).toContain('tkpl_gurulazer_tennisball_kpl');
  });

  it('renders all three channels in the SocialShowcase on the home page', () => {
    render(
      <MemoryRouter>
        <SocialShowcase />
      </MemoryRouter>
    );

    expect(screen.getByText('TKPL Official')).toBeInTheDocument();
    expect(screen.getByText('Sultan Sports Kadapa')).toBeInTheDocument();
    
    // Shows NR Sports Vempalli in card header and co-partner callout under Sultan Sports
    const nrElements = screen.getAllByText('NR Sports Vempalli');
    expect(nrElements.length).toBeGreaterThanOrEqual(1);

    const links = screen.getAllByRole('link');
    const nrSportsLink = links.find((l) => l.getAttribute('href') === NR_SPORTS_INSTAGRAM_URL);
    expect(nrSportsLink).toBeDefined();

    const sultanLink = links.find((l) => l.getAttribute('href') === SULTAN_INSTAGRAM_URL);
    expect(sultanLink).toBeDefined();
  });

  it('opens and closes the QR Code modal for NR Sports Instagram', () => {
    render(
      <MemoryRouter>
        <SocialShowcase />
      </MemoryRouter>
    );

    // Initial state: modal should not be visible
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click QR Code button
    const qrButton = screen.getByRole('button', { name: /qr code/i });
    fireEvent.click(qrButton);

    // Dialog appears with QR code image and handle
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('@NR_SPORTS_VEMPALLI')).toBeInTheDocument();

    const qrImg = screen.getByAltText(/NR Sports Instagram QR Code/i);
    expect(qrImg.getAttribute('src')).toBe(NR_SPORTS_QR_SRC);

    // Close dialog
    const closeBtn = screen.getByRole('button', { name: /close qr modal/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders all three channels in InstagramFollowSection component', () => {
    render(
      <MemoryRouter>
        <InstagramFollowSection />
      </MemoryRouter>
    );

    expect(screen.getByText('T-KPL Official')).toBeInTheDocument();
    expect(screen.getByText('Sultan Sports Kadapa')).toBeInTheDocument();
    expect(screen.getByText('NR Sports Vempalli')).toBeInTheDocument();
  });
});
