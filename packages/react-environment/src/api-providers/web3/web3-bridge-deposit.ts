import { ChainId, evmIdIntoChainId, getEVMChainNameFromInternal } from '@webb-dapp/apps/configs';
import { createTornDeposit, Deposit } from '@webb-dapp/contracts/utils/make-deposit';
import { BridgeConfig, DepositPayload as IDepositPayload, MixerSize } from '@webb-dapp/react-environment';
import { WebbWeb3Provider } from '@webb-dapp/react-environment/api-providers/web3/webb-web3-provider';
import { Note, NoteGenInput } from '@webb-tools/sdk-mixer';

import { u8aToHex } from '@polkadot/util';

import { BridgeDeposit } from '../../webb-context/bridge/bridge-deposit';
import { transactionNotificationConfig } from '@webb-dapp/wallet/providers/polkadot/transaction-notification-config';
import React from 'react';
import { DepositNotification } from '@webb-dapp/ui-components/notification/DepositNotification';

type DepositPayload = IDepositPayload<Note, [Deposit, number | string]>;

export class Web3BridgeDeposit extends BridgeDeposit<WebbWeb3Provider, DepositPayload> {
  bridgeConfig: BridgeConfig = {};

  async deposit(depositPayload: DepositPayload): Promise<void> {
    const bridge = this.activeBridge;
    if (!bridge) {
      throw new Error('api not ready');
    }
    try {
      // Getting the active bridge
      const commitment = depositPayload.params[0].commitment;
      const note = depositPayload.note.note;

      transactionNotificationConfig.loading?.({
        address: '',
        data: React.createElement(DepositNotification, {
          chain: getEVMChainNameFromInternal(Number(note.chain)),
          amount: Number(note.amount),
          currency: bridge.currency.name,
        }),
        key: 'bridge-deposit',
        path: {
          method: 'deposit',
          section: bridge.currency.name,
        },
      });

      // Find the Anchor for this bridge amount
      const anchor = bridge.anchors.find((anchor) => anchor.amount == note.amount);
      if (!anchor) {
        throw new Error('not Anchor for amount' + note.amount);
      }
      // Get the contract address for the destination chain
      const contractAddress = anchor.anchorAddresses[Number(note.chain) as ChainId];
      if (!contractAddress) {
        throw new Error(`No Anchor for the chain ${note.chain}`);
      }
      const contract = this.inner.getWebbAnchorByAddress(contractAddress);
      await contract.deposit(commitment);
      transactionNotificationConfig.finalize?.({
        address: '',
        data: undefined,
        key: 'bridge-deposit',
        path: {
          method: 'deposit',
          section: bridge.currency.name,
        },
      });
    } catch (e) {
      if (!e.code) {
        throw e;
      }
      if (e.code == 4001) {
        transactionNotificationConfig.failed?.({
          address: '',
          data: 'User Rejected Deposit',
          key: 'bridge-deposit',

          path: {
            method: 'deposit',
            section: bridge.currency.name,
          },
        });
      } else {
        transactionNotificationConfig.failed?.({
          address: '',
          data: 'Deposit Transaction Failed',
          key: 'bridge-deposit',

          path: {
            method: 'deposit',
            section: bridge.currency.name,
          },
        });
      }
    }
  }

  async getSizes(): Promise<MixerSize[]> {
    const bridge = this.activeBridge;
    if (bridge) {
      return bridge.anchors.map((anchor) => ({
        id: `Bridge=${anchor.amount}@${bridge.currency.name}`,
        title: `${anchor.amount} ${bridge.currency.prefix}`,
      }));
    }
    return [];
  }

  /*
   *
   *  Mixer id => the fixed deposit amount
   * destChainId => the Chain the token will be bridged to
   * */
  async generateBridgeNote(mixerId: number | string, destChainId: ChainId): Promise<DepositPayload> {
    const bridge = this.activeBridge;
    if (!bridge) {
      throw new Error('api not ready');
    }
    const tokenSymbol = bridge.currency.name;
    const activeChainEvmId = await this.inner.getChainId();
    const sourceChainId = evmIdIntoChainId(activeChainEvmId);
    const deposit = createTornDeposit();
    const secrets = deposit.preimage;
    const amount = String(mixerId).replace('Bridge=', '').split('@')[0];
    const noteInput: NoteGenInput = {
      prefix: 'webb.bridge',
      chain: String(destChainId),
      amount: amount,
      denomination: '18',
      hashFunction: 'Poseidon',
      curve: 'Bn254',
      backend: 'Circom',
      version: 'v1',
      tokenSymbol: tokenSymbol,
      secrets: u8aToHex(secrets),
    };
    const note = await Note.generateNote(noteInput);
    return {
      note: note,
      params: [deposit, mixerId],
    };
  }
}
