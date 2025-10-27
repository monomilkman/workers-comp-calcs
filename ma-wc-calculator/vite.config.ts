import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor libraries (large dependencies)
          'vendor-react': ['react', 'react-dom'],
          'vendor-pdf': ['jspdf', 'html2canvas'],
          'vendor-office': ['xlsx', 'docx'],
          'vendor-ui': ['lucide-react', 'sonner', '@floating-ui/react'],

          // App chunks (split by feature)
          'settlement-calculators': [
            './src/components/MVASettlementCalculator.tsx',
            './src/components/GLSettlementCalculator.tsx'
          ],
          'export-utils': ['./src/utils/export.ts'],
        }
      }
    },
    // Increase chunk size warning limit since we're now splitting intentionally
    chunkSizeWarningLimit: 600
  }
})
