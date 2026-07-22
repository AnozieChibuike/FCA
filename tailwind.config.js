/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#81B64C',
        'primary-light': '#95C761',
        'primary-dark': '#6C9E42',
        cta: '#81B64C',
        'cta-hover': '#6C9E42',
        background: '#161512',
        'background-light': '#1E1C18',
        'background-card': '#262421',
        surface: '#262421',
        'surface-hover': '#2E2B27',
        'chess-border': '#363431',
        text: '#FFFFFF',
        'text-muted': '#8B8987',
      },
      borderColor: {
        'chess-border': '#363431',
      },
      fontFamily: {
        heading: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 2px 8px rgba(0, 0, 0, 0.4)',
        'btn': '0 2px 0 rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
