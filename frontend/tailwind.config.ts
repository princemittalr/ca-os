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
        brand: {
          DEFAULT: '#1B4F8A',
          dark: '#163F6E',
          light: '#2563AB',
          muted: '#E8EFF7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          raised: '#F7F8FA',
          sunken: '#F0F2F5',
          overlay: '#FFFFFF',
        },
        border: {
          DEFAULT: '#D1D5DB',
          strong: '#9CA3AF',
          subtle: '#E5E7EB',
        },
        text: {
          primary: '#111827',
          secondary: '#4B5563',
          muted: '#6B7280',
          disabled: '#9CA3AF',
          inverse: '#FFFFFF',
          link: '#1B4F8A',
        },
        status: {
          success: '#15803D',
          successBg: '#F0FDF4',
          warning: '#B45309',
          warningBg: '#FFFBEB',
          error: '#B91C1C',
          errorBg: '#FEF2F2',
          info: '#1D4ED8',
          infoBg: '#EFF6FF',
        },
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        xs: ['11px', { lineHeight: '16px', letterSpacing: '0.01em' }],
        sm: ['12px', { lineHeight: '18px' }],
        base: ['13px', { lineHeight: '20px' }],
        md: ['14px', { lineHeight: '20px' }],
        lg: ['15px', { lineHeight: '22px' }],
        xl: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        '2xl': ['18px', { lineHeight: '26px', fontWeight: '600' }],
        '3xl': ['20px', { lineHeight: '28px', fontWeight: '700' }],
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      spacing: {
        0.5: '2px', 1: '4px', 1.5: '6px', 2: '8px', 2.5: '10px',
        3: '12px', 3.5: '14px', 4: '16px', 5: '20px', 6: '24px',
        7: '28px', 8: '32px', 10: '40px', 12: '48px', 16: '64px',
      },
      borderRadius: {
        none: '0', sm: '2px', DEFAULT: '3px', md: '4px', lg: '6px', xl: '8px', full: '9999px',
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        md: '0 2px 6px 0 rgb(0 0 0 / 0.08)',
        lg: '0 4px 12px 0 rgb(0 0 0 / 0.10)',
        none: 'none',
      },
    },
  },
  plugins: [],
};
export default config;
