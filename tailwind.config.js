module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      height: {
        '2xl': '32rem',
        xl: '28rem',
        lg: '26rem'
      }
    },
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
