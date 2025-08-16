import type { Config } from 'tailwindcss'


export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './public/**/*.html'
  ],
  theme: { extend: {} },
} satisfies Config
