/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          500: '#14b8a6',
          600: '#0d9488',
          900: '#134e4a',
        },
        supabase: {
          dark: '#1c1c1c',
          darker: '#161616',
          border: '#3E3E3E',
          text: '#EDEDED',
          muted: '#8B8B8B',
          brand: '#24B47E'
        }
      }
    },
  },
  plugins: [],
}
