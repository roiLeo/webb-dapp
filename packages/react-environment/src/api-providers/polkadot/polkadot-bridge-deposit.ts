import {
  ChainId,
  chainIdIntoPolkadotId,
  chainsConfig,
  currenciesConfig,
  getPolkadotChainNameFromInternal,
} from '@webb-dapp/apps/configs';
import { Bridge } from '@webb-dapp/bridge/Bridge';
import { createAnchor2Deposit, Deposit } from '@webb-dapp/contracts/utils/make-deposit';
import { NativeTokenProperties } from '@webb-dapp/mixer';
import { Currency } from '@webb-dapp/mixer/utils/currency';
import { DepositPayload as IDepositPayload, MixerSize } from '@webb-dapp/react-environment';
import { DepositPayload as IDepositPayload, MixerDeposit } from '@webb-dapp/react-environment/webb-context';
import { Currency } from '@webb-dapp/react-environment/webb-context/currency/currency';
import { ORMLCurrency } from '@webb-dapp/react-environment/webb-context/currency/orml-currency';
import { WebbError, WebbErrorCodes } from '@webb-dapp/utils/webb-error';
import { LoggerService } from '@webb-tools/app-util';
import { Note, NoteGenInput } from '@webb-tools/sdk-core';
import { PalletMixerMixerMetadata } from '@webb-tools/types/interfaces/pallets';

import { BridgeDeposit } from '../../webb-context/bridge/bridge-deposit';
import { WebbPolkadot } from '.';
const logger = LoggerService.get('web3-bridge-deposit');
import { DepositNotification } from '@webb-dapp/ui-components/notification/DepositNotification';
import { transactionNotificationConfig } from '@webb-dapp/wallet/providers/polkadot/transaction-notification-config';
import React from 'react';

import { u8aToHex } from '@polkadot/util';

type DepositPayload = IDepositPayload<Note, [Deposit, number | string, string?]>;

export class PolkadotBridgeDeposit extends BridgeDeposit<WebbPolkadot, DepositPayload> {
  async deposit(depositPayload: DepositPayload): Promise<void> {
    const bridge = this.activeBridge;
    if (!bridge) {
      throw new Error('api not ready');
    }
    try {
      // getting active bridge
      const commitment = depositPayload.params[0].commitment;
      const note = depositPayload.note.note;

      // TODO: Ensure this function is created (once PRs are merged)
      const sourcePolkadotId = 'await this.inner.getChainId';

      // TODO: To be updated with catch-all version
      const sourceChainId = 'someFnForInternalIdToChainId(sourcePolkadotId)';

      transactionNotificationConfig.loading?.({
        address: '',
        data: React.createElement(DepositNotification, {
          chain: getPolkadotChainNameFromInternal(Number(note.sourceChainId)),
          amount: Number(note.amount),
          currency: bridge.currency.view.name,
        }),
        key: 'bridge-deposit',
        path: {
          method: depositPayload.params[2] ? 'wrap and deposit' : 'deposit',
          section: bridge.currency.view.name,
        },
      });

      // find the anchor for this bridge amount
      const anchor = bridge.anchors.find((anchor) => anchor.amount == note.amount);
      if (!anchor) {
        throw new Error('not Anchor for amount' + note.amount);
      }

      // Get the contract address for the destination chain

      // TODO WIll be clarified once sourceChainId can be correctly derived
      // const contractAddress = anchor.anchorAddresses[sourceChainId];
      // if (!contractAddress) {
      //   throw new Error(`No Anchor for the chain ${note.targetChainId}`);
      // }

      // TODO Needs to be created for Polkadot
      // const contract = this.inner.getWebbAnchorByAddress(contractAddress);

      // If a wrappableAsset was selected, perform a wrapAndDeposit
      if (depositPayload.params[2]) {
        const requiredApproval = await contract.isWrappableTokenApprovalRequired(depositPayload.params[2]);
        if (requiredApproval) {
          notificationApi.addToQueue({
            message: 'Waiting for token approval',
            variant: 'info',
            key: 'waiting-approval',
            extras: { persist: true },
          });
          const tokenInstance = await ERC20__factory.connect(
            depositPayload.params[2],
            this.inner.getEthersProvider().getSigner()
          );
          const webbToken = await contract.getWebbToken();
          const tx = await tokenInstance.approve(webbToken.address, await contract.denomination);
          await tx.wait();
          notificationApi.remove('waiting-approval');
        }

        const enoughBalance = await contract.hasEnoughBalance(depositPayload.params[2]);
        if (enoughBalance) {
          await contract.wrapAndDeposit(commitment, depositPayload.params[2]);
          transactionNotificationConfig.finalize?.({
            address: '',
            data: undefined,
            key: 'bridge-deposit',
            path: {
              method: 'wrap and deposit',
              section: bridge.currency.view.name,
            },
          });
        } else {
          notificationApi.addToQueue({
            message: 'Not enough token balance',
            variant: 'error',
            key: 'waiting-approval',
          });
        }
        return;
      } else {
        const requiredApproval = await contract.isWebbTokenApprovalRequired();
        if (requiredApproval) {
          notificationApi.addToQueue({
            message: 'Waiting for token approval',
            variant: 'info',
            key: 'waiting-approval',
            extras: { persist: true },
          });
          const tokenInstance = await contract.getWebbToken();
          const tx = await tokenInstance.approve(contract.inner.address, await contract.denomination);
          await tx.wait();
          notificationApi.remove('waiting-approval');
        }

        const enoughBalance = await contract.hasEnoughBalance();
        if (enoughBalance) {
          await contract.deposit(String(commitment));
          transactionNotificationConfig.finalize?.({
            address: '',
            data: undefined,
            key: 'bridge-deposit',
            path: {
              method: 'deposit',
              section: bridge.currency.view.name,
            },
          });
        } else {
          notificationApi.addToQueue({
            message: 'Not enough token balance',
            variant: 'error',
            key: 'waiting-approval',
          });
        }
      }
    } catch (e: any) {
      console.log(e);
      if ((e as any)?.code == 4001) {
        notificationApi.remove('waiting-approval');
        transactionNotificationConfig.failed?.({
          address: '',
          data: 'User Rejected Deposit',
          key: 'bridge-deposit',

          path: {
            method: 'deposit',
            section: bridge.currency.view.name,
          },
        });
      } else {
        notificationApi.remove('waiting-approval');
        transactionNotificationConfig.failed?.({
          address: '',
          data: 'Deposit Transaction Failed',
          key: 'bridge-deposit',

          path: {
            method: 'deposit',
            section: bridge.currency.view.name,
          },
        });
      }
    }
  }

  async getSizes(): Promise<MixerSize[]> {
    const bridge = this.activeBridge;
    if (bridge) {
      return bridge.anchors.map((anchor) => ({
        id: `Bridge=${anchor.amount}@${bridge.currency.view.name}`,
        title: `${anchor.amount} ${bridge.currency.view.name}`,
      }));
    }
    return [];
  }

  async generateBridgeNote(
    mixerId: string | number,
    destination: ChainId,
    wrappableAssetAddress?: string
  ): Promise<DepositPayload> {
    const bridge = this.activeBridge;
    if (!bridge) {
      throw new Error('api not ready');
    }
    const tokenSymbol = bridge.currency.view.symbol;

    // TODO: Ensure this function is created (once PRs are merged)
    const sourcePolkadotId = 'await this.inner.getChainId';

    // TODO: This can be specified once other destinations are clarified
    const destPolkadotId = sourcePolkadotId;

    const deposit = createAnchor2Deposit(destination);
    const secrets = deposit.preimage;
    const amount = String(mixerId).replace('Bridge=', '').split('@')[0];

    // TODO: To be updated with catch-all version
    const sourceChainId = 'someFnForInternalIdToChainId(sourcePolkadotId)';

    // TODO: Check if polkadot should have a denomination specifier
    const properties = await this.inner.api.rpc.system.properties();
    const denomination = properties.tokenDecimals.toHuman() || 12;

    const noteInput: NoteGenInput = {
      exponentiation: '5',
      width: '5',
      prefix: 'webb.bridge',
      chain: String(destPolkadotId),
      sourceChain: String(sourceChainId),
      amount: amount,
      denomination: `${denomination}`,
      hashFunction: 'Poseidon',
      curve: 'Bn254',
      backend: 'Arkworks',
      version: 'v1',
      tokenSymbol: tokenSymbol,
      secrets: u8aToHex(secrets),
    };
    const note = await Note.generateNote(noteInput);
    return {
      note: note,
      params: [deposit, mixerId, wrappableAssetAddress],
    };
  }
}
