# CC Token Platform - Frontend

A comprehensive decentralized compute marketplace platform built with React.js, featuring Web3 integration, multi-language support, and a modern user interface.

## 🌟 Features

### Core Functionality
- **Decentralized Compute Marketplace**: Connect with global computing resources
- **CC Token Economy**: Built-in token economics with staking and rewards
- **NFT System**: Customer and Provider NFTs with exclusive benefits
- **ETH Vault**: Secure ETH deposit and withdrawal system
- **Multi-chain Support**: Compatible with Ethereum, Polygon, BSC, and other EVM chains

### Technical Features
- **🌍 Full Internationalization**: Complete Chinese and English language support
- **🎨 Modern UI/UX**: Responsive design with Tailwind CSS
- **🔐 Web3 Integration**: Secure wallet connection with RainbowKit
- **📱 Mobile Responsive**: Optimized for all device sizes
- **🌙 Dark/Light Theme**: Toggle between themes
- **📊 Real-time Data**: Live updates for balances and transactions

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Web3 wallet (MetaMask recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd cc_pay/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Open http://localhost:8088 in your browser
   - Connect your Web3 wallet to get started

### Build for Production
```bash
npm run build
```

## 🌍 Internationalization

This application features complete internationalization support:

### Supported Languages
- **Chinese (简体中文)**: Default language
- **English**: Full translation support

### Translation Architecture
- **react-i18next**: Industry standard internationalization library
- **Dynamic Language Switching**: Change languages without page reload
- **Persistent Settings**: Language preference saved in browser
- **Comprehensive Coverage**: All UI elements fully translated

### Translation Files
- `src/locales/zh.json`: Chinese translations
- `src/locales/en.json`: English translations
- 1000+ translation keys covering all features

### Language Switching
- Use the language toggle in the navigation bar
- Settings persist across sessions
- All content updates dynamically

## 📁 Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   │   ├── Layout.jsx      # Main layout component
│   │   ├── LanguageToggle.jsx  # Language switcher
│   │   ├── ThemeToggle.jsx     # Theme switcher
│   │   └── ...            # Other UI components
│   ├── pages/              # Main application pages
│   │   ├── Home.jsx        # Landing page
│   │   ├── Marketplace.jsx # Compute marketplace
│   │   ├── Staking.jsx     # Staking interface
│   │   ├── Profile.jsx     # User profile
│   │   ├── NFTManagement.jsx # NFT management
│   │   └── ETHVault.jsx    # ETH vault
│   ├── locales/            # Translation files
│   │   ├── zh.json         # Chinese translations
│   │   └── en.json         # English translations
│   ├── config/             # Configuration files
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services
│   └── utils/              # Utility functions
├── docs/                   # Documentation
└── README.md              # This file
```

## 🔧 Technology Stack

### Frontend Framework
- **React 18**: Modern React with hooks
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server

### UI/UX
- **Tailwind CSS**: Utility-first CSS framework
- **Heroicons**: Consistent icon library
- **Headless UI**: Accessible UI components

### Web3 Integration
- **Wagmi**: React hooks for Ethereum
- **Viem**: TypeScript interface for Ethereum
- **RainbowKit**: Wallet connection library

### Internationalization
- **react-i18next**: Internationalization framework
- **i18next-browser-languagedetector**: Auto language detection
- **i18next-localstorage-backend**: Persistent language settings

### Development Tools
- **ESLint**: Code linting
- **PostCSS**: CSS processing
- **Autoprefixer**: CSS vendor prefixes

## 🌐 Application Pages

### Home (`/`)
- Landing page with platform overview
- Real-time statistics and data
- Feature highlights and benefits
- Call-to-action for wallet connection

### Marketplace (`/marketplace`)
- Browse computing services
- Filter by service type and price
- NFT discount integration
- Order creation and management

### Staking (`/staking`)
- CC and ETH token staking
- NFT minting interface
- Rewards tracking
- Real-time APR display

### Profile (`/profile`)
- User dashboard and statistics
- Asset overview
- Activity history
- Settings management

### NFT Management (`/nfts`)
- Customer and Provider NFT display
- Tier information and benefits
- Minting interface
- Upgrade options

### ETH Vault (`/eth-vault`)
- ETH deposit and withdrawal
- Vault balance tracking
- Transaction history
- Security features

## 🔐 Security Features

### Smart Contract Integration
- Secure contract interactions
- Input validation and sanitization
- Error handling and recovery
- Transaction monitoring

### Data Protection
- No sensitive data stored locally
- Secure API communication
- Input validation
- XSS protection

### Wallet Security
- Non-custodial wallet integration
- Signature-based authentication
- Secure transaction signing
- Hardware wallet support

## 🎨 UI/UX Features

### Design System
- Consistent color scheme
- Typography standards
- Component library
- Accessibility compliance

### Interactive Elements
- Smooth transitions and animations
- Loading states and feedback
- Error handling and recovery
- Toast notifications

### Responsive Design
- Mobile-first approach
- Tablet and desktop layouts
- Touch-friendly interfaces
- Performance optimization

## 📊 Real-time Features

### Live Data Updates
- Balance monitoring
- Transaction status tracking
- Staking reward updates
- Market data refresh

### Event-driven Updates
- Blockchain event listening
- WebSocket connections
- Automatic data refresh
- Background synchronization

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the project root:
```bash
VITE_API_URL=http://localhost:3001/api
```

### Contract Configuration
Update `src/config/contracts.js` with your deployed contract addresses:
```javascript
export const CONTRACT_ADDRESSES = {
  CC_TOKEN: '0x...',
  STAKING_POOL: '0x...',
  CUSTOMER_NFT: '0x...',
  PROVIDER_NFT: '0x...',
  COMPUTE_MARKET: '0x...',
  PROVIDER_INCENTIVE: '0x...',
  ETH_VAULT: '0x...'
}
```

## 🚀 Deployment

### Build Process
1. Install dependencies: `npm install`
2. Build for production: `npm run build`
3. Deploy `dist/` folder to your hosting service

### Static Hosting
Compatible with:
- Vercel
- Netlify
- GitHub Pages
- AWS S3 + CloudFront
- Any static hosting service

### Environment Configuration
- Set appropriate API URLs
- Configure contract addresses for target network
- Update CORS settings if needed

## 🧪 Testing

### Development Testing
```bash
npm run dev     # Start development server
npm run build   # Test production build
```

### Code Quality
- ESLint integration
- TypeScript type checking
- Component testing capabilities
- Build validation

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with proper translation keys
4. Test both language versions
5. Submit pull request

### Internationalization Guidelines
- Always add translation keys for new text
- Update both zh.json and en.json files
- Use descriptive keys with proper namespacing
- Test language switching functionality

## 📝 License

This project is part of the CC Token Economy platform. See the main project repository for license information.

## 🆘 Support

### Documentation
- See `CLAUDE.md` for detailed project information
- Check component files for inline documentation
- Review translation files for text references

### Common Issues
- **Wallet Connection**: Ensure MetaMask is installed and unlocked
- **Network Issues**: Check if connected to correct blockchain network
- **Balance Display**: Refresh page if balances don't update
- **Language Issues**: Clear browser cache if language switching fails

### Development Help
- Check browser console for errors
- Verify contract addresses in configuration
- Ensure backend API is running for full functionality
- Test with different wallet providers

---

## 📈 Platform Statistics

- **Total Translation Keys**: 1000+
- **Supported Languages**: 2 (Chinese, English)
- **Component Coverage**: 100%
- **Mobile Responsive**: ✅
- **Web3 Compatible**: ✅
- **Production Ready**: ✅

Built with ❤️ for the decentralized computing community