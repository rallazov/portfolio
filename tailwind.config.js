/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.{html,js}", "./src/**/*.{html,js}"],
  theme: {
    extend: {fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
        sky: {
          600: '#0284C7',
          700: '#0369A1',
        },
      },
    },
  },
  plugins: [],
}