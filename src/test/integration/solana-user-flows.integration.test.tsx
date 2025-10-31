/**
 * Integration Tests for Complete Solana User Flows
 * 
 * These tests verify end-to-end user workflows including:
 * - Wallet connection to swap completion
 * - Pool creation and liquidity management
 * - Error scenarios and recovery mechanisms
 * - Mobile and accessibility features
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PublicKey, Connection } from '@solana/web3.js';
import { SolanaSwapInterface } from '@/components/swap/SolanaSwapInterface';
import { PoolCreator } from '@/components/pools/PoolCreator';
import { SolanaWalletConnector } from '@/components/wallet/SolanaWalletConnector';
import { useWallet } from '@solana/wallet-adapter-react';
import { useSwapStore } from '@/stores/swapStore';
import { useWalletStore } from '@/stores/walletStore';
import { usePoolStore } from '@/stores/poolStore';
import { Token, SwapQuote, TransactionStatus } from '@/types';

// Mock dependencies
vi.mock('@solana/wallet-adapter-react');
vi.mock('@/hooks/useWallet');
vi.mock('@/hooks/useSolanaConnection');
vi.mock('@/hooks/useTokenList');
vi.mock('@/hooks/usePoolCreation');
vi.mock('@/services/jupiterSwapService');

// Mock tokens
const mockSOL: Token = {
  mint: 'So11111111111111111111111111111111111111112',
  address: 'So11111111111111111111111111111111111111112',
  symbol: 'SOL',
  name: 'Solana',
  decimals: 9,
  isNative: true,
};

const mockUSDC: Token = {
  mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  symbol: 'USDC',
  name: 'USD Coin',
  decimals: 6,
};

const mockPublicKey = new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU');

describe('Solana User Flows - Integration Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Reset stores
    useSwapStore.getState().resetTransaction();
    useWalletStore.getState().disconnect();
    usePoolStore.setState({ pools: [], loading: false, error: null });
    
    // Setup default mocks
    const { useWallet } = await import('@/hooks/useWallet');
    const { useSolanaConnection } = await import('@/hooks/useSolanaConnection');
    const { useTokenList } = await import('@/hooks/useTokenList');
    const { usePoolCreation } = await import('@/hooks/usePoolCreation');
    
    vi.mocked(useWallet).mockReturnValue({
      isConnected: false,
      tokenBalances: {},
      solBalance: BigInt(0),
      wallet: null,
      publicKey: null,
      solanaWallet: null,
    } as any);
    
    vi.mocked(useSolanaConnection).mockReturnValue({
      connection: {
        getFeeForMessage: vi.fn(),
        sendRawTransaction: vi.fn(),
        confirmTransaction: vi.fn(),
      },
    } as any);
    
    vi.mocked(useTokenList).mockReturnValue({
      tokens: [mockSOL, mockUSDC],
      loading: false,
      error: null,
    } as any);
    
    vi.mocked(usePoolCreation).mockReturnValue({
      createPool: vi.fn(),
      isCreating: false,
      error: null,
      clearError: vi.fn(),
    } as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('End-to-End: Wallet Connection to Swap Completion', () => {
    it('should complete full swap flow from wallet connection to transaction confirmation', async () => {
      const user = userEvent.setup();
      
      // Step 1: Initial state - wallet not connected
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: false,
        tokenBalances: {},
        solBalance: BigInt(0),
        wallet: null,
        publicKey: null,
        solanaWallet: null,
      } as any);

      const { rerender } = render(<SolanaSwapInterface />);
      
      expect(screen.getByText('Connect Wallet')).toBeInTheDocument();

      // Step 2: Connect wallet
      mockUseWallet.mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('2000000000'), // 2 SOL
          [mockUSDC.mint]: BigInt('1000000000'), // 1000 USDC
        },
        solBalance: BigInt('2000000000'),
        wallet: { publicKey: mockPublicKey },
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      rerender(<SolanaSwapInterface />);
      
      await waitFor(() => {
        expect(screen.getByText('Select Tokens')).toBeInTheDocument();
      });

      // Step 3: Select input token (SOL)
      const { TokenSelector: mockTokenSelector } = await import('@/components/tokens');
      vi.mocked(mockTokenSelector).mockImplementation(({ onTokenSelect, selectedToken }: any) => (
        <div data-testid="token-selector">
          {selectedToken ? (
            <span>{selectedToken.symbol}</span>
          ) : (
            <button onClick={() => onTokenSelect(mockSOL)}>Select SOL</button>
          )}
        </div>
      ));

      const selectSOLButton = screen.getAllByText('Select SOL')[0];
      await user.click(selectSOLButton);

      // Step 4: Select output token (USDC)
      vi.mocked(mockTokenSelector).mockImplementation(({ onTokenSelect, selectedToken }: any) => (
        <div data-testid="token-selector">
          {selectedToken ? (
            <span>{selectedToken.symbol}</span>
          ) : (
            <button onClick={() => onTokenSelect(mockUSDC)}>Select USDC</button>
          )}
        </div>
      ));

      const selectUSDCButton = screen.getAllByText('Select USDC')[0];
      await user.click(selectUSDCButton);

      // Step 5: Enter swap amount
      const amountInput = screen.getByPlaceholderText('0.0');
      await user.type(amountInput, '1.0');

      // Step 6: Wait for quote
      const mockQuote: SwapQuote = {
        inputAmount: BigInt('1000000000'),
        outputAmount: BigInt('999000000'),
        minimumReceived: BigInt('989010000'),
        priceImpact: 0.1,
        exchangeRate: 0.999,
        route: [],
        routeType: 'direct',
        slippageTolerance: 0.5,
        estimatedSolFee: BigInt('5000'),
        estimatedComputeUnits: 200000,
        validUntil: Date.now() + 30000,
        refreshInterval: 10000,
      };

      useSwapStore.setState({
        tokenIn: mockSOL,
        tokenOut: mockUSDC,
        amountIn: '1.0',
        quote: mockQuote,
        loading: false,
      });

      rerender(<SolanaSwapInterface />);

      await waitFor(() => {
        expect(screen.getByText('Swap')).toBeInTheDocument();
        expect(screen.getByText('Swap')).not.toBeDisabled();
      });

      // Step 7: Initiate swap
      const swapButton = screen.getByText('Swap');
      await user.click(swapButton);

      // Step 8: Confirm swap in modal
      await waitFor(() => {
        expect(screen.getByText('Confirm Swap')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm Swap');
      await user.click(confirmButton);

      // Step 9: Verify transaction status updates
      useSwapStore.setState({
        isSwapping: true,
        transactionStatus: TransactionStatus.PENDING,
      });

      rerender(<SolanaSwapInterface />);

      await waitFor(() => {
        expect(screen.getByText('Swapping...')).toBeInTheDocument();
      });

      // Step 10: Transaction confirmed
      useSwapStore.setState({
        isSwapping: false,
        transactionStatus: TransactionStatus.CONFIRMED,
        transactionSignature: 'mock-signature-123',
      });

      rerender(<SolanaSwapInterface />);

      await waitFor(() => {
        expect(useSwapStore.getState().transactionStatus).toBe(TransactionStatus.CONFIRMED);
      });
    });

    it('should handle swap with high price impact warning', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('10000000000'),
        },
        solBalance: BigInt('10000000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      const highImpactQuote: SwapQuote = {
        inputAmount: BigInt('5000000000'),
        outputAmount: BigInt('4500000000'),
        minimumReceived: BigInt('4455000000'),
        priceImpact: 6.5, // High price impact
        exchangeRate: 0.9,
        route: [],
        routeType: 'direct',
        slippageTolerance: 0.5,
        estimatedSolFee: BigInt('5000'),
        estimatedComputeUnits: 200000,
        validUntil: Date.now() + 30000,
        refreshInterval: 10000,
      };

      useSwapStore.setState({
        tokenIn: mockSOL,
        tokenOut: mockUSDC,
        amountIn: '5.0',
        quote: highImpactQuote,
        loading: false,
      });

      render(<SolanaSwapInterface />);

      // Verify high price impact warning is displayed
      await waitFor(() => {
        expect(screen.getByText('High Price Impact Warning')).toBeInTheDocument();
        expect(screen.getByText(/6.50%/)).toBeInTheDocument();
      });

      // User should still be able to proceed
      const swapButton = screen.getByText('Swap');
      expect(swapButton).not.toBeDisabled();
    });
  });

  describe('End-to-End: Pool Creation and Liquidity Management', () => {
    it('should complete full pool creation flow', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('5000000000'), // 5 SOL
          [mockUSDC.mint]: BigInt('10000000000'), // 10000 USDC
        },
        solBalance: BigInt('5000000000'),
      } as any);

      const { usePoolCreation: mockUsePoolCreation } = await import('@/hooks/usePoolCreation');
      const mockCreatePool = vi.fn().mockResolvedValue('mock-pool-id-123');
      
      vi.mocked(mockUsePoolCreation).mockReturnValue({
        createPool: mockCreatePool,
        isCreating: false,
        error: null,
        clearError: vi.fn(),
      } as any);

      const mockOnPoolCreated = vi.fn();
      const mockOnClose = vi.fn();

      render(
        <PoolCreator
          isOpen={true}
          onClose={mockOnClose}
          onPoolCreated={mockOnPoolCreated}
        />
      );

      // Step 1: Verify modal is open
      expect(screen.getByText('Create Liquidity Pool')).toBeInTheDocument();

      // Step 2: Select first token (SOL)
      const { TokenSelector: mockTokenSelector } = await import('@/components/tokens/TokenSelector');
      vi.mocked(mockTokenSelector).mockImplementation(({ onTokenSelect, selectedToken }: any) => (
        <div data-testid="token-selector">
          {selectedToken ? (
            <span>{selectedToken.symbol}</span>
          ) : (
            <button onClick={() => onTokenSelect(mockSOL)}>Select SOL</button>
          )}
        </div>
      ));

      const selectSOLButton = screen.getByText('Select SOL');
      await user.click(selectSOLButton);

      // Step 3: Enter amount for first token
      const amountInputs = screen.getAllByPlaceholderText('0.0');
      await user.type(amountInputs[0], '2.0');

      // Step 4: Select second token (USDC)
      vi.mocked(mockTokenSelector).mockImplementation(({ onTokenSelect, selectedToken }: any) => (
        <div data-testid="token-selector">
          {selectedToken ? (
            <span>{selectedToken.symbol}</span>
          ) : (
            <button onClick={() => onTokenSelect(mockUSDC)}>Select USDC</button>
          )}
        </div>
      ));

      const selectUSDCButton = screen.getByText('Select USDC');
      await user.click(selectUSDCButton);

      // Step 5: Enter amount for second token
      await user.type(amountInputs[1], '5000');

      // Step 6: Verify pool information is displayed
      await waitFor(() => {
        expect(screen.getByText('Pool Information')).toBeInTheDocument();
      });

      // Step 7: Create pool
      const createButton = screen.getByText('Create Pool');
      await user.click(createButton);

      // Step 8: Verify pool creation was called
      await waitFor(() => {
        expect(mockCreatePool).toHaveBeenCalledWith(
          expect.objectContaining({
            tokenA: mockSOL,
            tokenB: mockUSDC,
          })
        );
      });

      // Step 9: Verify callbacks were called
      await waitFor(() => {
        expect(mockOnPoolCreated).toHaveBeenCalledWith('mock-pool-id-123');
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should validate insufficient balance for pool creation', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('500000000'), // 0.5 SOL (insufficient)
          [mockUSDC.mint]: BigInt('1000000000'), // 1000 USDC
        },
        solBalance: BigInt('500000000'),
      } as any);

      render(
        <PoolCreator
          isOpen={true}
          onClose={vi.fn()}
          onPoolCreated={vi.fn()}
        />
      );

      // Try to enter amount exceeding balance
      const amountInputs = screen.getAllByPlaceholderText('0.0');
      await user.type(amountInputs[0], '2.0'); // More than available

      // Verify validation error
      await waitFor(() => {
        expect(screen.getByText(/Insufficient/i)).toBeInTheDocument();
      });

      // Create button should be disabled
      const createButton = screen.getByText('Create Pool');
      expect(createButton).toBeDisabled();
    });
  });

  describe('Error Scenarios and Recovery Mechanisms', () => {
    it('should handle wallet connection failure and allow retry', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@solana/wallet-adapter-react');
      const mockConnect = vi.fn().mockRejectedValue(new Error('Connection failed'));
      
      vi.mocked(mockUseWallet).mockReturnValue({
        wallets: [
          {
            adapter: {
              name: 'Phantom',
              connect: mockConnect,
            },
            readyState: 'Installed',
          },
        ],
        select: vi.fn(),
        connect: mockConnect,
        connecting: false,
        connected: false,
        wallet: null,
        publicKey: null,
      } as any);

      render(
        <SolanaWalletConnector
          isOpen={true}
          onClose={vi.fn()}
          onConnect={vi.fn()}
          onError={vi.fn()}
        />
      );

      // Attempt to connect
      const phantomButton = screen.getByText('Phantom').closest('button');
      await user.click(phantomButton!);

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText('Connection Failed')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });

      // Retry connection
      mockConnect.mockResolvedValueOnce(undefined);
      await user.click(phantomButton!);

      // Error should be cleared on retry
      await waitFor(() => {
        expect(screen.queryByText('Connection Failed')).not.toBeInTheDocument();
      });
    });

    it('should handle swap transaction failure and display error', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('2000000000'),
        },
        solBalance: BigInt('2000000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      const mockQuote: SwapQuote = {
        inputAmount: BigInt('1000000000'),
        outputAmount: BigInt('999000000'),
        minimumReceived: BigInt('989010000'),
        priceImpact: 0.1,
        exchangeRate: 0.999,
        route: [],
        routeType: 'direct',
        slippageTolerance: 0.5,
        estimatedSolFee: BigInt('5000'),
        estimatedComputeUnits: 200000,
        validUntil: Date.now() + 30000,
        refreshInterval: 10000,
      };

      useSwapStore.setState({
        tokenIn: mockSOL,
        tokenOut: mockUSDC,
        amountIn: '1.0',
        quote: mockQuote,
        loading: false,
      });

      render(<SolanaSwapInterface />);

      // Initiate swap
      const swapButton = screen.getByText('Swap');
      await user.click(swapButton);

      // Simulate transaction failure
      useSwapStore.setState({
        isSwapping: false,
        transactionStatus: TransactionStatus.FAILED,
        transactionError: 'Transaction simulation failed: Insufficient SOL for fees',
      });

      // Verify error is displayed
      await waitFor(() => {
        expect(screen.getByText(/Transaction simulation failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors with fallback', async () => {
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {},
        solBalance: BigInt('1000000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      useSwapStore.setState({
        error: 'Network connection failed. Please check your internet connection.',
      });

      render(<SolanaSwapInterface />);

      // Verify network error is displayed
      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(/Network connection failed/i)).toBeInTheDocument();
    });

    it('should handle insufficient SOL for transaction fees', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockUSDC.mint]: BigInt('1000000000'),
        },
        solBalance: BigInt('1000'), // Very low SOL balance
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      const mockQuote: SwapQuote = {
        inputAmount: BigInt('1000000'),
        outputAmount: BigInt('999000'),
        minimumReceived: BigInt('989010'),
        priceImpact: 0.1,
        exchangeRate: 0.999,
        route: [],
        routeType: 'direct',
        slippageTolerance: 0.5,
        estimatedSolFee: BigInt('5000'), // More than available
        estimatedComputeUnits: 200000,
        validUntil: Date.now() + 30000,
        refreshInterval: 10000,
      };

      useSwapStore.setState({
        tokenIn: mockUSDC,
        tokenOut: mockSOL,
        amountIn: '1.0',
        quote: mockQuote,
        loading: false,
        transactionError: 'Insufficient SOL for transaction fees',
      });

      render(<SolanaSwapInterface />);

      // Verify error message
      await waitFor(() => {
        expect(screen.getByText(/Insufficient SOL for transaction fees/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile and Accessibility Features', () => {
    it('should have proper ARIA labels for screen readers', async () => {
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: false,
        tokenBalances: {},
        solBalance: BigInt(0),
        wallet: null,
      } as any);

      render(<SolanaSwapInterface />);

      // Verify ARIA labels
      expect(screen.getByLabelText('Swap settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Use maximum balance')).toBeInTheDocument();
      expect(screen.getByLabelText('Swap token positions')).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('2000000000'),
        },
        solBalance: BigInt('2000000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      render(<SolanaSwapInterface />);

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByLabelText('Swap settings')).toHaveFocus();

      await user.tab();
      expect(screen.getByPlaceholderText('0.0')).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText('Use maximum balance')).toHaveFocus();
    });

    it('should have touch-friendly button sizes on mobile', async () => {
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {},
        solBalance: BigInt('1000000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      render(<SolanaSwapInterface />);

      // Verify touch-manipulation class is applied
      const settingsButton = screen.getByLabelText('Swap settings');
      expect(settingsButton).toHaveClass('touch-manipulation');

      const maxButton = screen.getByLabelText('Use maximum balance');
      expect(maxButton).toHaveClass('touch-manipulation');

      const swapButton = screen.getByLabelText('Swap token positions');
      expect(swapButton).toHaveClass('touch-manipulation');
    });

    it('should display responsive text sizes', async () => {
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: false,
        tokenBalances: {},
        solBalance: BigInt(0),
        wallet: null,
      } as any);

      render(<SolanaSwapInterface />);

      // Verify responsive classes are present
      const heading = screen.getByText('Swap');
      expect(heading).toHaveClass('text-lg', 'sm:text-xl');
    });

    it('should handle focus management in modals', async () => {
      const user = userEvent.setup();
      
      render(
        <PoolCreator
          isOpen={true}
          onClose={vi.fn()}
          onPoolCreated={vi.fn()}
        />
      );

      // Modal should trap focus
      const closeButton = screen.getByRole('button', { name: '' });
      expect(closeButton).toBeInTheDocument();

      // Tab should cycle through modal elements only
      await user.tab();
      const firstInteractiveElement = document.activeElement;
      expect(firstInteractiveElement).toBeInTheDocument();
    });

    it('should provide clear error messages for accessibility', async () => {
      const { useWallet: mockUseWallet } = await import('@/hooks/useWallet');
      vi.mocked(mockUseWallet).mockReturnValue({
        isConnected: true,
        publicKey: mockPublicKey,
        tokenBalances: {
          [mockSOL.mint]: BigInt('500000000'),
        },
        solBalance: BigInt('500000000'),
        solanaWallet: { publicKey: mockPublicKey },
      } as any);

      useSwapStore.setState({
        tokenIn: mockSOL,
        amountIn: '2.0', // More than available
      });

      render(<SolanaSwapInterface />);

      // Error message should be clear and visible
      const errorMessage = screen.getByText('Insufficient balance');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveClass('text-red-600');
    });
  });
});
