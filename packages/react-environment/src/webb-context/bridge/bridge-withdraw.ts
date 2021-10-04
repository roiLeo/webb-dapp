import { ChainId } from '@webb-dapp/apps/configs';
import { Bridge } from '@webb-dapp/react-environment/webb-context/bridge/bridge';
import { BridgeConfig } from '@webb-dapp/react-environment/webb-context/bridge/bridge-config';
import { DepositNote } from '@webb-tools/sdk-mixer';
import { WebbRelayer } from '@webb-dapp/react-environment/webb-context/relayer';
import { MixerWithdraw } from '../mixer/mixer-withdraw';

export abstract class BridgeWithdraw<T> extends MixerWithdraw<T> {
  abstract bridgeConfig: BridgeConfig;

  get tokens() {
    return Bridge.getTokens(this.bridgeConfig);
  }

  getRandomSourceChainRelayer(note: DepositNote): Promise<WebbRelayer | undefined> {
    return Promise.resolve(undefined);
  }

  getTokensOfChain(chainId: ChainId) {
    return Bridge.getTokensOfChain(this.bridgeConfig, chainId);
  }
  getTokensOfChains(chainIds: ChainId[]) {
    return Bridge.getTokensOfChains(this.bridgeConfig, chainIds);
  }
}
