/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fcf8f2',
          100: '#f8eedf',
          200: '#f0d9bd',
          300: '#e5be91',
          400: '#d79c62',
          500: '#ce803d',
          600: '#c06b33',
          700: '#9f512c',
          800: '#80422a',
          900: '#683725',
          950: '#381a12',
        },
      },
    },
  },
  plugins: [],
}

