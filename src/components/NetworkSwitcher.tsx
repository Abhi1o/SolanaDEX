'use client';

import React, { Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { useSolanaNetwork } from '../providers/SolanaWalletProvider';
import { SolanaNetwork } from '../config/solana';

interface NetworkOption {
  value: SolanaNetwork;
  label: string;
  description: string;
  color: string;
}

const NETWORK_OPTIONS: NetworkOption[] = [
  {
    value: 'mainnet-beta',
    label: 'Mainnet Beta',
    description: 'Solana mainnet for production use',
    color: 'bg-green-500',
  },
  {
    value: 'devnet',
    label: 'Devnet',
    description: 'Development network for testing',
    color: 'bg-yellow-500',
  },
  {
    value: 'testnet',
    label: 'Testnet',
    description: 'Test network for validation',
    color: 'bg-blue-500',
  },
];

export const NetworkSwitcher: React.FC = () => {
  const { network, switchNetwork, isNetworkSwitching } = useSolanaNetwork();

  const currentNetwork = NETWORK_OPTIONS.find(option => option.value === network) || NETWORK_OPTIONS[1];

  const handleNetworkChange = async (newNetwork: NetworkOption) => {
    if (newNetwork.value !== network && !isNetworkSwitching) {
      try {
        await switchNetwork(newNetwork.value);
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    }
  };

  return (
    <div className="w-72">
      <Listbox value={currentNetwork} onChange={handleNetworkChange} disabled={isNetworkSwitching}>
        <div className="relative mt-1">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full ${currentNetwork.color} mr-3`} />
              <span className="block truncate font-medium">{currentNetwork.label}</span>
              {isNetworkSwitching && (
                <div className="ml-2 w-4 h-4 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin" />
              )}
            </div>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
              {NETWORK_OPTIONS.map((networkOption) => (
                <Listbox.Option
                  key={networkOption.value}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${
                      active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                    }`
                  }
                  value={networkOption}
                >
                  {({ selected }) => (
                    <>
                      <div className="flex items-center">
                        <div className={`w-3 h-3 rounded-full ${networkOption.color} mr-3`} />
                        <div>
                          <span
                            className={`block truncate ${
                              selected ? 'font-medium' : 'font-normal'
                            }`}
                          >
                            {networkOption.label}
                          </span>
                          <span className="text-xs text-gray-500">
                            {networkOption.description}
                          </span>
                        </div>
                      </div>
                      {selected ? (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      </Listbox>
    </div>
  );
};