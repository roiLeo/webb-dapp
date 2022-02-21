import { DepositPayload, MixerDeposit } from '../mixer/mixer-deposit';

export abstract class BridgeDeposit<T, K extends DepositPayload = DepositPayload<any>> extends MixerDeposit<T, K> {
  generateNote(mixerId: number | string): Promise<K> {
    throw new Error('api not ready:Not mixer api');
  }

  abstract generateBridgeNote(
    mixerId: number | string,
    destination: number,
    wrappableAssetAddress?: string
  ): Promise<K>;
}
