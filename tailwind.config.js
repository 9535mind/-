/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './public/**/*.{html,js}',
  ],
  theme: {
    extend: {
      colors: {
        classic: {
          cream: '#FDFCF8',
          sage: '#5C7F67',
          forest: '#2F4F3A',
          moss: '#8FAF95',
        },
        next: {
          ink: '#0f172a',
          accent: '#2563eb',
          silver: '#94a3b8',
          frost: '#e2e8f0',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard Variable',
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Roboto',
          'Helvetica Neue',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'Noto Sans KR',
          'Malgun Gothic',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Segoe UI Symbol',
          'sans-serif',
        ],
      },
      letterSpacing: {
        tighter: '-0.05em',
      },
      lineHeight: {
        relaxed: '1.7',
      },
      borderRadius: {
        '2xl': '16px',
      },
    },
  },
  plugins: [],
}
