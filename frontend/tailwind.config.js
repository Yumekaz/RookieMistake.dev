/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'gh': {
          'bg': '#0d1117',
          'bg-secondary': '#161b22',
          'bg-tertiary': '#21262d',
          'border': '#30363d',
          'border-subtle': '#21262d',
          'text': '#e6edf3',
          'text-muted': '#7d8590',
          'accent': '#2f81f7',
          'accent-hover': '#388bfd',
          'success': '#3fb950',
          'warning': '#d29922',
          'error': '#f85149',
        },
        'accent': {
          'green': '#7ee787',
          'blue': '#2f81f7',
          'purple': '#a371f7',
          'pink': '#f778ba',
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'Consolas', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'glow-green': '0 0 20px rgba(63, 185, 80, 0.3)',
        'glow-blue': '0 0 20px rgba(47, 129, 247, 0.3)',
        'glow-amber': '0 0 20px rgba(210, 153, 34, 0.3)',
        'glow-red': '0 0 20px rgba(248, 81, 73, 0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
