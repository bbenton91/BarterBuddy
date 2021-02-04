module.exports = {
  darkMode: 'class', // This can be 'media' if preferred.
  purge: [
    './src/**/*.svelte',
    './src/**/*.html',
    './public/**/*.html',
  ],
  theme: {
    extend: {
      colors: {
        svelte: '#ff3e00',
      },
    },
    maxWidth: {
      '1': '1rem',
      '2': '2rem',
      '3': '3rem',
      '4': '4rem',
      '5': '5rem',
      '6': '6rem',
     }
  },
  variants: {},
  plugins: [],
}
