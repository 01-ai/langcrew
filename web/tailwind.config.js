/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  important: true,
  theme: {
    extend: {
      keyframes: {
        'fade-in-out': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
      },
      animation: {
        'fade-in-out': 'fade-in-out 3s ease-out infinite',
      },
    },
  },
  plugins: [],
};
