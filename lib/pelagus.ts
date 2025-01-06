import { useState, useEffect } from 'react';

declare global {
  interface Window {
    pelagus: any;
  }
}

export function usePelagusWallet() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);

  const connectWallet = async () => {
    if (typeof window.pelagus !== 'undefined') {
      try {
        const accounts = await window.pelagus.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        const balance = await window.pelagus.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest'],
        });
        setBalance(BigInt(balance).toString());
      } catch (error) {
        console.error('Failed to connect to Pelagus wallet:', error);
      }
    } else {
      console.log('Pelagus wallet not detected');
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    setBalance(null);
  };

  useEffect(() => {
    if (account) {
      const intervalId = setInterval(async () => {
        const balance = await window.pelagus.request({
          method: 'eth_getBalance',
          params: [account, 'latest'],
        });
        setBalance(BigInt(balance).toString());
      }, 10000); // Update balance every 10 seconds

      return () => clearInterval(intervalId);
    }
  }, [account]);

  return { account, balance, connectWallet, disconnectWallet };
}

