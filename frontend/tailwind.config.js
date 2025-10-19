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
        // 主品牌色系 - 绿色主题
        'brand-primary': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16'
        },
        'brand-secondary': {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e'
        },
        'brand-accent': {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22'
        },
        // 功能色系
        'success': {
          light: '#10b981',
          dark: '#34d399'
        },
        'warning': {
          light: '#f59e0b',
          dark: '#fbbf24'
        },
        'error': {
          light: '#ef4444',
          dark: '#f87171'
        },
        'info': {
          light: '#3b82f6',
          dark: '#60a5fa'
        },
        // 保持兼容的旧系统 - 绿色主题
        'cc-primary': {
          light: '#22c55e',
          dark: '#4ade80'
        },
        'cc-secondary': {
          light: '#14b8a6',
          dark: '#2dd4bf'
        },
        'cc-accent': {
          light: '#10b981',
          dark: '#34d399'
        },
        'cc-dark': '#1e293b',
        'cc-light': '#f8fafc',
        // 中性色系统
        'neutral': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a'
        },
        // 背景色系统
        'bg-primary': {
          light: '#ffffff',
          dark: '#0f172a'
        },
        'bg-secondary': {
          light: '#f8fafc',
          dark: '#1e293b'
        },
        'bg-tertiary': {
          light: '#f1f5f9',
          dark: '#334155'
        },
        // 文字色系统
        'text-primary': {
          light: '#0f172a',
          dark: '#f1f5f9'
        },
        'text-secondary': {
          light: '#64748b',
          dark: '#cbd5e1'
        },
        'text-tertiary': {
          light: '#94a3b8',
          dark: '#94a3b8'
        },
        // 边框色系统
        'border-primary': {
          light: '#e2e8f0',
          dark: '#334155'
        },
        'border-secondary': {
          light: '#cbd5e1',
          dark: '#475569'
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      backgroundImage: {
        // 品牌渐变系列 - 绿色主题
        'brand-gradient-primary': 'linear-gradient(135deg, #22c55e 0%, #14b8a6 50%, #10b981 100%)',
        'brand-gradient-secondary': 'linear-gradient(135deg, #4ade80 0%, #2dd4bf 50%, #34d399 100%)',
        'brand-gradient-accent': 'linear-gradient(135deg, #16a34a 0%, #0d9488 50%, #059669 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 50%, #ecfdf5 100%)',
        // 背景渐变系列
        'gradient-light': 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 50%, #ecfdf5 100%)',
        'gradient-dark': 'linear-gradient(135deg, #052e16 0%, #042f2e 50%, #022c22 100%)',
        'gradient-theme': 'linear-gradient(135deg, #f0fdf4 0%, #f0fdfa 50%, #ecfdf5 100%)',
        // 功能渐变系列
        'gradient-success': 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
        'gradient-info': 'linear-gradient(135deg, #3b82f6 0%, #0ea5e9 100%)',
        'gradient-warning': 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        'gradient-error': 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)'
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'shrink': 'shrink 3s linear forwards',
        'fade-in': 'fadeIn 0.3s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-slow': 'pulse 3s infinite'
      },
      keyframes: {
        slideInRight: {
          '0%': {
            transform: 'translateX(100%)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateX(0)',
            opacity: '1',
          },
        },
        shrink: {
          '0%': {
            width: '100%',
          },
          '100%': {
            width: '0%',
          },
        },
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(10px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        bounceGentle: {
          '0%, 100%': {
            transform: 'translateY(0)',
          },
          '50%': {
            transform: 'translateY(-5px)',
          },
        }
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem'
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100'
      }
    },
  },
  plugins: [
    // 可以在这里添加需要的插件，比如：
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ]
}