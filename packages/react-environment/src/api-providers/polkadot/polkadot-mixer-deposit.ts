import { NativeTokenProperties } from '@webb-dapp/mixer';
import { Currency } from '@webb-dapp/mixer/utils/currency';
import { DepositPayload as IDepositPayload, MixerDeposit } from '@webb-dapp/react-environment/webb-context';
import { WebbError, WebbErrorCodes } from '@webb-dapp/utils/webb-error';
import { LoggerService } from '@webb-tools/app-util';
import { Token } from '@webb-tools/sdk-core';
import { Note, NoteGenInput } from '@webb-tools/sdk-mixer';

import { WebbPolkadot } from './webb-polkadot-provider';

type DepositPayload = IDepositPayload<Note, [number, Uint8Array]>;
const logger = LoggerService.get('polkadotMixerDposit');

export class PolkadotMixerDeposit extends MixerDeposit<WebbPolkadot, DepositPayload> {
  async getSizes() {
    const data = await this.inner.api.query.mixer.mixers.entries();
    logger.trace(`Mixers`, data);
    // @ts-ignore
    const tokenProperty: Array<NativeTokenProperties> = await this.inner.api.rpc.system.properties();
    const groupItem = data
      .map(([_, entry]) => {
        const entryData = (entry as any).value;
        const currencyId = entryData.asset.toHuman();
        const depositSize = Number(entryData.depositSize.toHuman());
        const creator = entryData.creator.toHuman();
        console.log({ entryData });
        return {
          amount: depositSize,
          currency: Currency.fromCurrencyId(0, this.inner.api, depositSize),
          id: `${creator}-${currencyId}-${depositSize}`,
          token: new Token({
            amount: depositSize.toString(),
            // TODO: Pull from active chain
            chain: 'edgeware',
            name: 'DEV',
            // @ts-ignore
            precision: Number(tokenProperty?.toHuman().tokenDecimals?.[0] ?? 12),
            symbol: 'EDG',
          }),
        };
      })
      .map(({ amount, currency, token }, index) => ({
        id: index,
        value: Math.round(amount),
        title: Math.round(amount) + ` ${currency.symbol}`,
        symbol: currency.symbol,
      }))
      .sort((a, b) => (a.value > b.value ? 1 : a.value < b.value ? -1 : 0));
    return groupItem;
  }

  async generateNote(mixerId: number): Promise<DepositPayload> {
    logger.trace(`Generating note for mixer id of ${mixerId}`);
    const sizes = await this.getSizes();
    const amount = sizes.find((size) => size.id === mixerId);
    logger.trace(`Mixer amount of id ${mixerId} is ${amount?.title} `, amount);
    if (!amount) {
      throw Error('amount not found! for mixer id ' + mixerId);
    }
    // todo store the chain id in the provider
    const chainId = 1; /* this.inner.chainId() */
    const noteInput: NoteGenInput = {
      prefix: 'web.mix',
      version: 'v1',

      backend: 'Arkworks',
      hashFunction: 'Poseidon',
      curve: 'Bn254',
      denomination: '18',

      amount: String(amount.value),
      chain: String(chainId),
      sourceChain: String(chainId),
      tokenSymbol: amount.symbol,
    };
    const depositNote = await Note.generateNote(noteInput);
    const leaf = depositNote.getLeaf();
    logger.trace(`Mixer deposit params`, Number(depositNote.note.amount), leaf);
    return {
      note: depositNote,
      params: [Number(depositNote.note.amount), leaf],
    };
  }

  async deposit(depositPayload: DepositPayload): Promise<void> {
    const tx = this.inner.txBuilder.build(
      {
        section: 'mixer',
        method: 'deposit',
      },
      depositPayload.params
    );

    const account = await this.inner.accounts.activeOrDefault;
    if (!account) {
      throw WebbError.from(WebbErrorCodes.NoAccountAvailable);
    }
    tx.on('finalize', () => {
      console.log('deposit done');
    });
    tx.on('finalize', (e: any) => {
      console.log('deposit failed', e);
    });
    tx.on('extrinsicSuccess', () => {
      console.log('deposit done');
    });
    await tx.call(account.address);
    return;
  }
}
