module.exports = {
  content: [
    './App.{js, ts,jsx,tsx}',
    './screens/**/*.{js,ts,jsx,tsx}',
    './pages/**/*.{js,ts,jsx,tsx}',
    'components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Define custom colors for light and dark modes
        light: {
          background: '#000000',
          text: '#FFFFFF',
        },
        dark: {
          background: '#000000',
          text: '#FFFFFF',
        },
      },
    },
  },
  plugins: [],
};
