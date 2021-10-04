import { depositFromAnchor2Preimage } from '@webb-dapp/contracts/utils/make-deposit';
import { Bridge, bridgeConfig, BridgeConfig, BridgeCurrency, WithdrawState } from '@webb-dapp/react-environment';
import { WebbWeb3Provider } from '@webb-dapp/react-environment/api-providers/web3/webb-web3-provider';
import { Note } from '@webb-tools/sdk-mixer';
import { RelayedWithdrawResult, WebbRelayer } from '@webb-dapp/react-environment/webb-context/relayer';

import { BridgeWithdraw, OptionalActiveRelayer, OptionalRelayer } from '../../webb-context';
import {
  ChainId,
  chainIdIntoEVMId,
  chainsConfig,
  evmIdIntoChainId,
  getEVMChainNameFromInternal,
} from '@webb-dapp/apps/configs';
import { transactionNotificationConfig } from '@webb-dapp/wallet/providers/polkadot/transaction-notification-config';
import React from 'react';
import { LoggerService } from '@webb-tools/app-util';
import { DepositNote } from '@webb-tools/wasm-utils';
import { Web3Provider } from '@webb-dapp/wallet/providers/web3/web3-provider';
import { WebbError, WebbErrorCodes } from '@webb-dapp/utils/webb-error';
import { BigNumber } from 'ethers';
import { bridgeCurrencyBridgeStorageFactory } from './bridge-storage';

const logger = LoggerService.get('Web3BridgeWithdraw');

export class Web3BridgeWithdraw extends BridgeWithdraw<WebbWeb3Provider> {
  bridgeConfig: BridgeConfig = bridgeConfig;

  async getRelayersByNote(evmNote: Note) {
    const chainId = evmNote.note.chain;
    return this.inner.relayingManager.getRelayer({
      baseOn: 'evm',
      chainId: Number(chainId),
      mixerSupport: {
        amount: Number(evmNote.note.amount),
        tokenSymbol: evmNote.note.tokenSymbol,
      },
    });
  }

  async getRandomSourceChainRelayer(note: DepositNote): Promise<WebbRelayer | undefined> {
    const chainId = note.sourceChain;
    const relayers = await this.inner.relayingManager.getRelayer({
      baseOn: 'evm',
      chainId: Number(chainId),
      bridgeSupport: {
        amount: Number(note.amount),
        tokenSymbol: note.tokenSymbol,
      },
    });
    // if no relayers exist, return undefined
    if (!relayers.length) return undefined;
    return relayers[Math.floor(Math.random() * relayers.length)];
  }

  async mapRelayerIntoActive(relayer: OptionalRelayer): Promise<OptionalActiveRelayer> {
    if (!relayer) {
      return null;
    }
    const evmId = await this.inner.getChainId();
    const chainId = evmIdIntoChainId(evmId);
    return WebbRelayer.intoActiveWebRelayer(
      relayer,
      {
        basedOn: 'evm',
        chain: chainId,
      },
      // Define the function for retrieving fee information for the relayer
      async (note: string) => {
        const depositNote = await Note.deserialize(note);
        const evmNote = depositNote.note;

        const contract = await this.inner.getContractBySize(Number(evmNote.amount), evmNote.tokenSymbol);

        // Given the note, iterate over the potential relayers and find the corresponding relayer configuration
        // for the contract.
        const supportedContract = relayer.capabilities.supportedChains['evm']
          .get(Number(evmNote.chain))
          ?.contracts.find(({ address }) => {
            return address.toLowerCase() === contract.inner.address.toLowerCase();
          });

        // The user somehow selected a relayer which does not support the mixer.
        // This should not be possible as only supported mixers should be selectable in the UI.
        if (!supportedContract) {
          throw WebbError.from(WebbErrorCodes.RelayerUnsupportedMixer);
        }

        const principleBig = await contract.denomination;

        const withdrawFeeMill = supportedContract.withdrawFeePercentage * 1000000;

        const withdrawFeeMillBig = BigNumber.from(withdrawFeeMill);
        const feeBigMill = principleBig.mul(withdrawFeeMillBig);

        const feeBig = feeBigMill.div(BigNumber.from(1000000));
        return {
          totalFees: feeBig.toString(),
          withdrawFeePercentage: supportedContract.withdrawFeePercentage,
        };
      }
    );
  }

  async sameChainWithdraw(note: DepositNote, recipient: string) {
    this.cancelToken.cancelled = false;

    // Todo Ensure the current provider is the same as the source
    const activeChain = await this.inner.getChainId();
    const internalId = evmIdIntoChainId(activeChain);
    if (Number(note.chain) !== internalId) {
      throw new Error(`The provider isn't the connected to the expected provider `);
    }
    const bridge = Bridge.from(this.bridgeConfig, BridgeCurrency.fromString(note.tokenSymbol));

    const contractAddresses = bridge.anchors.find((anchor) => anchor.amount === note.amount)!;
    const contractAddress = contractAddresses.anchorAddresses[internalId]!;

    const contract = this.inner.getWebbAnchorByAddress(contractAddress);
    const accounts = await this.inner.accounts.accounts();
    const account = accounts[0];

    const deposit = depositFromAnchor2Preimage(note.secret.replace('0x', ''), Number(activeChain));
    logger.info(`Commitment for withdraw is ${deposit.commitment}`);

    const input = {
      destinationChainId: activeChain,
      secret: deposit.secret,
      nullifier: deposit.nullifier,
      nullifierHash: deposit.nullifierHash,

      // Todo change this to the realyer address
      relayer: account.address,
      recipient: account.address,

      fee: 0,
      refund: 0,
    };

    logger.trace(`input for zkp`, input);
    this.emit('stateChange', WithdrawState.GeneratingZk);
    const zkpResults = await contract.generateZKP(deposit, input);
    transactionNotificationConfig.loading?.({
      address: recipient,
      data: React.createElement(
        'p',
        { style: { fontSize: '.9rem' } }, // Matches Typography variant=h6
        `Withdraw in progress`
      ),
      key: 'bridge-withdraw-evm',
      path: {
        method: 'withdraw',
        section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
      },
    });

    // Check for cancelled here, abort if it was set.
    if (this.cancelToken.cancelled) {
      transactionNotificationConfig.failed?.({
        address: recipient,
        data: 'Withdraw cancelled',
        key: 'mixer-withdraw-evm',
        path: {
          method: 'withdraw',
          section: 'evm-mixer',
        },
      });
      this.emit('stateChange', WithdrawState.Ideal);
      return;
    }

    this.emit('stateChange', WithdrawState.SendingTransaction);
    try {
      await contract.withdraw(
        zkpResults.proof,
        {
          destinationChainId: activeChain,
          fee: input.fee,
          nullifier: input.nullifier,
          nullifierHash: input.nullifierHash,
          pathElements: zkpResults.input.pathElements,
          pathIndices: zkpResults.input.pathIndices,
          recipient: input.recipient,
          refund: input.refund,
          relayer: input.relayer,
          root: zkpResults.root as any,
          secret: zkpResults.input.secret,
        },
        zkpResults.input
      );
    } catch (e) {
      this.emit('stateChange', WithdrawState.Ideal);
      transactionNotificationConfig.failed?.({
        address: recipient,
        data: e?.code === 4001 ? 'Withdraw rejected' : 'Withdraw failed',
        key: 'bridge-withdraw-evm',
        path: {
          method: 'withdraw',
          section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
        },
      });
      return;
    }

    this.emit('stateChange', WithdrawState.Ideal);
    transactionNotificationConfig.finalize?.({
      address: recipient,
      data: undefined,
      key: 'bridge-withdraw-evm',
      path: {
        method: 'withdraw',
        section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
      },
    });
  }

  async crossChainWithdraw(note: DepositNote, recipient: string) {
    this.cancelToken.cancelled = false;

    // check that the active api is over the source chain
    const sourceChain = Number(note.sourceChain) as ChainId;
    const sourceChainEvm = chainIdIntoEVMId(sourceChain);
    const activeChain = await this.inner.getChainId();
    if (activeChain !== sourceChainEvm) {
      throw new Error(`Expecting another active api for chain ${sourceChain} found ${evmIdIntoChainId(activeChain)}`);
    }

    // Temporary Provider for getting Anchors roots
    const destChainId = Number(note.chain) as ChainId;
    const destChainEvmId = chainIdIntoEVMId(destChainId);
    const destChainConfig = chainsConfig[destChainId];
    const rpc = destChainConfig.url;
    const destHttpProvider = Web3Provider.fromUri(rpc);
    const destEthers = destHttpProvider.intoEthersProvider();
    const deposit = depositFromAnchor2Preimage(note.secret.replace('0x', ''), destChainEvmId);
    this.emit('stateChange', WithdrawState.GeneratingZk);

    // Getting contracts data for source and dest chains
    const currency = BridgeCurrency.fromString(note.tokenSymbol);
    const bridge = Bridge.from(this.bridgeConfig, currency);
    const anchor = bridge.anchors.find((anchor) => anchor.amount === note.amount)!;
    const destContractAddress = anchor.anchorAddresses[destChainId]!;
    const sourceContractAddress = anchor.anchorAddresses[sourceChain]!;

    // get root and neighbour root from the dest provider
    const destAnchor = this.inner.getWebbAnchorByAddressAndProvider(destContractAddress, destEthers);
    const destAnchorChainId = await destAnchor.inner.chainID();
    console.log(`destAnchor chainID: ${destAnchorChainId}`);
    const destLatestRoot = await destAnchor.inner.getLastRoot();
    const destLatestNeighbourRootAr = await destAnchor.inner.getLatestNeighborRoots();
    const destLatestNeighbourRoot = destLatestNeighbourRootAr[0];

    logger.trace(`destLatestNeighbourRoot ${destLatestNeighbourRoot} , destLatestRoot ${destLatestRoot}`);
    // await destHttpProvider.endSession();

    // Building the merkle proof
    const sourceContract = this.inner.getWebbAnchorByAddress(sourceContractAddress);

    // fetch a relayer to query leaves
    const sourceRelayer = await this.getRandomSourceChainRelayer(note);

    const merkleProof = await sourceContract.generateMerkleProofForRoot(deposit, destLatestNeighbourRoot, sourceRelayer);
    if (!merkleProof) {
      this.emit('stateChange', WithdrawState.Ideal);
      throw new Error('Failed to generate Merkle proof');
    }

    // Check for cancelled here, abort if it was set.
    if (this.cancelToken.cancelled) {
      transactionNotificationConfig.failed?.({
        address: recipient,
        data: 'Withdraw cancelled',
        key: 'mixer-withdraw-evm',
        path: {
          method: 'withdraw',
          section: 'evm-mixer',
        },
      });
      this.emit('stateChange', WithdrawState.Ideal);
      return;
    }

    /// todo await for provider Change
    try {
      await this.inner.innerProvider.switchChain({
        chainId: `0x${destChainEvmId.toString(16)}`,
      });
    } catch (e) {
      this.emit('stateChange', WithdrawState.Ideal);
      transactionNotificationConfig.failed?.({
        address: recipient,
        data: e?.code === 4001 ? 'Withdraw rejected' : 'Withdraw failed',
        key: 'bridge-withdraw-evm',
        path: {
          method: 'withdraw',
          section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
        },
      });
      return;
    }
    const accounts = await this.inner.accounts.accounts();
    const account = accounts[0];

    const destContractWithSignedProvider = this.inner.getWebbAnchorByAddress(destContractAddress);
    const input = {
      destinationChainId: activeChain,
      secret: deposit.secret,
      nullifier: deposit.nullifier,
      nullifierHash: deposit.nullifierHash,

      // Todo change this to the realyer address
      relayer: account.address,
      recipient: account.address,

      fee: 0,
      refund: 0,
    };

    const zkpResults = await destContractWithSignedProvider.merkleProofToZKP(merkleProof, deposit, input);
    this.emit('stateChange', WithdrawState.SendingTransaction);

    try {
      await destContractWithSignedProvider.withdraw(
        zkpResults.proof,
        {
          destinationChainId: activeChain,
          fee: input.fee,
          nullifier: input.nullifier,
          nullifierHash: input.nullifierHash,
          pathElements: zkpResults.input.pathElements,
          pathIndices: zkpResults.input.pathIndices,
          recipient: input.recipient,
          refund: input.refund,
          relayer: input.relayer,
          root: zkpResults.root as any,
          secret: zkpResults.input.secret,
        },
        zkpResults.input
      );
    } catch (e) {
      this.emit('stateChange', WithdrawState.Ideal);
      transactionNotificationConfig.failed?.({
        address: recipient,
        data: e?.code === 4001 ? 'Withdraw rejected' : 'Withdraw failed',
        key: 'bridge-withdraw-evm',
        path: {
          method: 'withdraw',
          section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
        },
      });
      return;
    }

    this.emit('stateChange', WithdrawState.Ideal);
    transactionNotificationConfig.finalize?.({
      address: recipient,
      data: undefined,
      key: 'bridge-withdraw-evm',
      path: {
        method: 'withdraw',
        section: `Bridge ${bridge.currency.chainIds.map(getEVMChainNameFromInternal).join('-')}`,
      },
    });
  }

  async withdraw(note: string, recipient: string): Promise<void> {
    logger.trace(`Withdraw using note ${note} , recipient ${recipient}`);

    const parseNote = await Note.deserialize(note);
    const depositNote = parseNote.note;
    const sourceChainName = getEVMChainNameFromInternal(Number(depositNote.sourceChain) as ChainId);
    const targetChainName = getEVMChainNameFromInternal(Number(depositNote.chain) as ChainId);
    logger.trace(`Bridge withdraw from ${sourceChainName} to ${targetChainName}`);

    if (depositNote.sourceChain === depositNote.chain) {
      logger.trace(`Same chain flow ${sourceChainName}`);
      this.sameChainWithdraw(depositNote, recipient);
    } else {
      logger.trace(`cross chain flow ${sourceChainName} ----> ${targetChainName}`);
      this.crossChainWithdraw(depositNote, recipient);
    }
  }
}
