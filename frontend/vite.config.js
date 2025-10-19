import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 8088,
    host: true,
    open: true // 自动打开浏览器
  },
  css: {
    postcss: './postcss.config.js', // 启用PostCSS配置
    devSourcemap: true // 开发时启用CSS sourcemap
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['wagmi', 'viem', '@rainbow-me/rainbowkit', 'ethers'],
          utils: ['@tanstack/react-query', 'axios'],
          ui: ['@headlessui/react', '@heroicons/react']
        }
      }
    },
    sourcemap: true, // 构建时生成sourcemap
    minify: 'esbuild', // 使用esbuild压缩（更快）
    target: 'es2020', // 兼容性目标（支持BigInt）
    chunkSizeWarningLimit: 1000 // 块大小警告限制
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'), // 添加@别名
      '@config': resolve(__dirname, 'src/config'),
      '@components': resolve(__dirname, 'src/components'),
      '@pages': resolve(__dirname, 'src/pages'),
      '@hooks': resolve(__dirname, 'src/hooks'),
      '@utils': resolve(__dirname, 'src/utils'),
      '@services': resolve(__dirname, 'src/services')
    }
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'wagmi',
      'viem',
      '@rainbow-me/rainbowkit',
      'ethers',
      '@tanstack/react-query'
    ]
  },
  define: {
    // 全局常量定义
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
})