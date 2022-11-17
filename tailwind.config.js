const { fontSize } = require("@mui/system");

module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      height: {
        mxl: '27rem',
        xl: '28rem',
        '2xl': '32rem',
        '3xl':'35rem',
        lg: '23rem',
        xlg: '25rem'
      }
    },
    fontSize:{
      'xs': '.75rem',
      'sm': '.875rem',
      'tiny': '.875rem',
      'base': '1rem',
      'lg': '1.125rem',
      'xl': '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
      '5xl': '3rem',
      '6xl': '4rem',
      '7xl': '5rem',
      logonote:'0.58rem',
      brandnote:'0.72rem'
    }
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
