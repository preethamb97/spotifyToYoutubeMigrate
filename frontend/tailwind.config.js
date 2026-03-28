/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        spotify: {
          green: '#1DB954',
          dark: '#191414',
        },
        youtube: {
          red: '#FF0000',
          dark: '#282828',
        },
      },
    },
  },
  plugins: [],
};