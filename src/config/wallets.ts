import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  Coin98WalletAdapter,
  CloverWalletAdapter,
  SafePalWalletAdapter,
  TokenPocketWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { Adapter } from '@solana/wallet-adapter-base';
import { SolanaNetwork } from './solana';

// Map our network types to wallet adapter network types
export const getWalletAdapterNetwork = (network: SolanaNetwork): WalletAdapterNetwork => {
  switch (network) {
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet;
    case 'devnet':
      return WalletAdapterNetwork.Devnet;
    case 'testnet':
      return WalletAdapterNetwork.Testnet;
    default:
      return WalletAdapterNetwork.Devnet;
  }
};

// Wallet configuration interface
export interface WalletConfig {
  name: string;
  adapter: () => Adapter;
  icon: string;
  description: string;
  popular?: boolean;
  mobile?: boolean;
}

// Create wallet adapters for the given network
export const createWalletAdapters = (network: SolanaNetwork): Adapter[] => {
  const walletNetwork = getWalletAdapterNetwork(network);
  
  return [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter({ network: walletNetwork }),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new MathWalletAdapter(),
    new Coin98WalletAdapter(),
    new CloverWalletAdapter(),
    new SafePalWalletAdapter(),
    new TokenPocketWalletAdapter(),
  ];
};

// Wallet metadata for UI display
export const WALLET_CONFIGS: Record<string, WalletConfig> = {
  Phantom: {
    name: 'Phantom',
    adapter: () => new PhantomWalletAdapter(),
    icon: 'https://www.phantom.app/img/phantom-logo.svg',
    description: 'A friendly Solana wallet built for DeFi & NFTs',
    popular: true,
    mobile: true,
  },
  Solflare: {
    name: 'Solflare',
    adapter: () => new SolflareWalletAdapter(),
    icon: 'https://solflare.com/img/logo.svg',
    description: 'Solflare is a non-custodial wallet for Solana',
    popular: true,
    mobile: true,
  },
  Torus: {
    name: 'Torus',
    adapter: () => new TorusWalletAdapter(),
    icon: 'https://tor.us/images/torus-logo-blue.svg',
    description: 'Login with your existing social accounts',
  },
  Ledger: {
    name: 'Ledger',
    adapter: () => new LedgerWalletAdapter(),
    icon: 'https://www.ledger.com/wp-content/themes/ledger-v2/public/images/ledger-logo-long.svg',
    description: 'Connect your Ledger hardware wallet',
  },
  MathWallet: {
    name: 'MathWallet',
    adapter: () => new MathWalletAdapter(),
    icon: 'https://mathwallet.org/images/wallet/mathwallet_logo.png',
    description: 'Multi-platform crypto wallet',
    mobile: true,
  },
  Coin98: {
    name: 'Coin98',
    adapter: () => new Coin98WalletAdapter(),
    icon: 'https://coin98.com/images/logo.png',
    description: 'Non-custodial, multi-chain wallet',
    mobile: true,
  },
  Clover: {
    name: 'Clover',
    adapter: () => new CloverWalletAdapter(),
    icon: 'https://clv.org/images/clover-logo.svg',
    description: 'Multi-chain wallet and gateway',
  },
  SafePal: {
    name: 'SafePal',
    adapter: () => new SafePalWalletAdapter(),
    icon: 'https://www.safepal.io/images/logo.png',
    description: 'Hardware and software wallet',
    mobile: true,
  },
  TokenPocket: {
    name: 'TokenPocket',
    adapter: () => new TokenPocketWalletAdapter(),
    icon: 'https://www.tokenpocket.pro/img/logo.png',
    description: 'Multi-blockchain wallet',
    mobile: true,
  },
};

// Get popular wallets for quick access
export const getPopularWallets = (): WalletConfig[] => {
  return Object.values(WALLET_CONFIGS).filter(wallet => wallet.popular);
};

// Get mobile-compatible wallets
export const getMobileWallets = (): WalletConfig[] => {
  return Object.values(WALLET_CONFIGS).filter(wallet => wallet.mobile);
};

// Detect if user is on mobile device
export const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};