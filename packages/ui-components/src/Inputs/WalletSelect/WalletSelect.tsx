import { Avatar } from '@material-ui/core';
import { useWebContext } from '@webb-dapp/react-environment';
import { useNativeCurrencyBalance, useNativeCurrencySymbol } from '@webb-dapp/react-hooks/currency';
import { useAccounts } from '@webb-dapp/react-hooks/useAccounts';
import { useColorPallet } from '@webb-dapp/react-hooks/useColorPallet';
import { useWallets } from '@webb-dapp/react-hooks/useWallets';
import { Modal } from '@webb-dapp/ui-components/Modal/Modal';
import { Padding } from '@webb-dapp/ui-components/Padding/Padding';
import { ManagedWallet } from '@webb-tools/api-providers/types/wallet-config.interface';
import React, { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';

import { getRoundedAmountString } from '../..';
import { WalletManager } from './WalletManager';

const WalletSelectWrapper = styled.div`
  box-sizing: border-box;

  .wallet-logo-wrapper {
    width: 20px;
    height: 20px;
    background: transparent;
  }

  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 5px;
  height: 45px;
  border-radius: 12px;
  background: ${({ theme }) => theme.lightSelectionBackground};

  .select-wallet-button {
    display: flex;
    width: 100%;
    text-overflow: ellipsis;
    overflow: hidden;
    text-align: center;
    color: ${({ theme }) => theme.primaryText};
  }

  .account-name {
    display: block;
    margin-right: 0.2rem;
    width: 100px;
    text-overflow: ellipsis;
    overflow: hidden;
    text-align: center;
    font-size: 12px;
    color: ${({ theme }) => theme.secondaryText};
  }

  .account-balance {
    font-size: 12px;
    color: ${({ theme }) => (theme.type === 'dark' ? theme.accentColor : '#000000')};
  }
`;
type WalletSelectProps = {};

export const WalletSelect: React.FC<WalletSelectProps> = ({}) => {
  const [open, setOpen] = useState(false);
  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);
  const openModal = useCallback(() => {
    setOpen(true);
  }, []);
  const { wallets } = useWallets();

  const [selectedWallet, setSelectedWallet] = useState<ManagedWallet | null>(null);
  const { active: selectedAccount } = useAccounts();
  const { activeChain } = useWebContext();
  const palette = useColorPallet();

  useEffect(() => {
    const nextWallet = wallets.find(({ connected }) => connected);
    if (nextWallet) {
      setSelectedWallet(nextWallet);
    }
  }, [wallets, setSelectedWallet]);

  const amountBalanceString = `${getRoundedAmountString(
    Number(useNativeCurrencyBalance())
  )} ${useNativeCurrencySymbol()}`;

  return (
    <>
      <WalletSelectWrapper
        role='button'
        aria-disabled={!activeChain}
        onClick={() => {
          openModal();
        }}
        className='select-button'
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          {!selectedWallet && <span className='select-wallet-button'>Select a wallet</span>}
          {selectedWallet && (
            <>
              <Avatar className={'wallet-logo-wrapper'}>
                <selectedWallet.logo />
              </Avatar>
              <Padding x={0.3} as='span' />
              <p className='account-balance'>{amountBalanceString}</p>
              <Padding x={0.3} as='span' />
              <p className='account-name'>{selectedAccount?.name || selectedAccount?.address}</p>
              <Padding x={0.6} as='span' />
              <div style={{ paddingRight: '5px' }}>
                <svg width='11' height='6' viewBox='0 0 11 6' fill='none' xmlns='http://www.w3.org/2000/svg'>
                  <path
                    d='M5.36788 5.95672C5.50193 5.941 5.62843 5.87924 5.7302 5.77983L10.3239 1.35013C10.4005 1.2919 10.4653 1.21613 10.5141 1.12776C10.5629 1.0394 10.5945 0.940447 10.6069 0.837384C10.6193 0.734321 10.6122 0.629473 10.586 0.52971C10.5599 0.429946 10.5154 0.337516 10.4553 0.258474C10.3952 0.179433 10.3209 0.115564 10.2374 0.0710493C10.1538 0.0265349 10.0629 0.00238028 9.97045 0.000167176C9.87803 -0.00204593 9.78622 0.0177322 9.70106 0.0582068C9.6159 0.0986815 9.53931 0.15894 9.47629 0.235033L5.30637 4.25712L1.13645 0.235033C1.07343 0.158939 0.99682 0.0986811 0.911662 0.0582064C0.826503 0.0177318 0.734709 -0.00204633 0.642283 0.000166768C0.549857 0.00237987 0.458885 0.0265345 0.375335 0.0710488C0.291783 0.115563 0.21755 0.179433 0.157466 0.258474C0.0973816 0.337515 0.0527992 0.429945 0.0266752 0.529709C0.000551196 0.629473 -0.00652507 0.73432 0.00587364 0.837384C0.0182724 0.940447 0.0498828 1.0394 0.0986394 1.12776C0.147396 1.21612 0.212192 1.2919 0.288791 1.35013L4.88254 5.77983C4.94885 5.84427 5.02594 5.89312 5.1093 5.9235C5.19266 5.95388 5.28058 5.96517 5.36788 5.95672Z'
                    fill={palette.iconColor}
                  />
                </svg>
              </div>
            </>
          )}
        </div>
      </WalletSelectWrapper>

      <Modal open={open} onClose={closeModal}>
        <WalletManager close={closeModal} />
      </Modal>
    </>
  );
};
