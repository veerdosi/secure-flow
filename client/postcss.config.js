module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  plugins: [require('postcss-import'), require('tailwindcss'), require('autoprefixer')],
}
