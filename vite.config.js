import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  preview: {
    allowedHosts: [
      'digicoders-worksphere-adminpanel.onrender.com'
    ]
  },
  plugins: [
    react(),
    tailwindcss(),

  ],
})
