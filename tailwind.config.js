/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './public/**/*.{html,js}',
  ],
  theme: {
    extend: {
      colors: {
        /** MindStory 브랜드 — 딥 네이비·화이트/그레이 */
        mst: {
          navy: { DEFAULT: '#0a1628', light: '#132337' },
          ink: '#0f172a',
          surface: '#f8fafc',
          canvas: '#f1f5f9',
          line: '#e2e8f0',
          muted: '#64748b',
          accent: '#3b5bdb',
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
