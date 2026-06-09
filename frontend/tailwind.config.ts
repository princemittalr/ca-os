import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1B4F8A',
          hover: '#163F6E',
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        purple: '#7C3AED',
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        text: {
          primary: '#0F172A',
          secondary: '#64748B',
          muted: '#94A3B8',
        },
      },
      fontSize: {
        h1: ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.025em' }],
        h2: ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        caption: ['12px', { lineHeight: '1.5', fontWeight: '500' }],
        'badge': ['11px', { lineHeight: '1', fontWeight: '600', letterSpacing: '0.025em' }],
        'input': ['13px', { lineHeight: '1' }],
        'button': ['13px', { lineHeight: '1' }],
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        0: '0px',
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
        12: '48px',
        16: '64px',
      },
      borderRadius: {
        card: '12px',
        input: '10px',
        button: '10px',
        badge: '6px',
        tag: '4px',
        'xl': '12px', // for rounded-xl
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        elevated: '0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', // overriding default sm
      },
    },
  },
  plugins: [],
};
export default config;
