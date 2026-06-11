/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta DARK GLAM do Studio Bella — troque aqui para re-skin rápido.
        // Os nomes são semânticos: "white" = superfície de cartão, "cocoa" = texto.
        white: '#2E2220',   // superfícies (cartões, inputs)
        cream: '#231816',   // fundo geral
        petal: '#2A1E1B',   // fundo de destaque suave
        blush: '#3C2A28',   // chips, hovers
        linen: '#4A3531',   // bordas
        rose: {
          light: '#E5B9C1', // detalhes claros decorativos
          DEFAULT: '#C77E8A', // ação principal / destaque
          dark: '#E0A0AC',  // texto de destaque (mais claro p/ contraste no escuro)
        },
        cocoa: {
          light: '#A68D84', // texto secundário/apagado
          DEFAULT: '#D9C4BB', // texto normal
          dark: '#F4E8E0',  // texto principal (marfim)
        },
        gold: '#D9B886',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Jost', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
