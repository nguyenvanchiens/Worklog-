/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef4ff',
          100: '#dae6ff',
          200: '#bcd0ff',
          300: '#8fb0ff',
          400: '#5e85fb',
          500: '#3a5ff5',
          600: '#2643e5',
          700: '#1f33c8',
          800: '#1f2ea0',
          900: '#1f2c7e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
