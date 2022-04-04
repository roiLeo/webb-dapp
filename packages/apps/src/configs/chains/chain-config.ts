import EdgewareLogo from '@webb-dapp/apps/configs/logos/chains/EdgewareLogo';
import HarmonyLogo from '@webb-dapp/apps/configs/logos/chains/HarmonyLogo';
import ShidenLogo from '@webb-dapp/apps/configs/logos/chains/ShidenLogo';
import EtherLogo from '@webb-dapp/apps/configs/logos/Eth';
import { AppConfig } from '@webb-dapp/react-environment/webb-context';

import { WebbCurrencyId } from '../currencies/webb-currency-id.enum';
import { ChainType, EVMChainId, InternalChainId, SubstrateChainId } from './chain-id.enum';

export const getSupportedCurrenciesOfChain = (chainId: InternalChainId): WebbCurrencyId[] => {
  return chainsConfig[chainId].currencies;
};

export const chainsConfig: AppConfig['chains'] = {
  [InternalChainId.Rinkeby]: {
    chainType: ChainType.EVM,
    group: 'eth',
    id: InternalChainId.Rinkeby,
    chainId: EVMChainId.Rinkeby,
    name: 'Rinkeby',
    url: 'https://rinkeby.infura.io/v3/e54b7176271840f9ba62e842ff5d6db4',
    evmRpcUrls: ['https://rinkeby.infura.io/v3/e54b7176271840f9ba62e842ff5d6db4'],
    blockExplorerStub: 'https://rinkeby.etherscan.io',
    logo: EtherLogo,
    tag: 'test',
    currencies: [WebbCurrencyId.ETH, WebbCurrencyId.WETH],
    nativeCurrencyId: WebbCurrencyId.ETH,
  },
  [InternalChainId.HarmonyTestnet1]: {
    chainType: ChainType.EVM,
    group: 'one',
    id: InternalChainId.HarmonyTestnet1,
    chainId: EVMChainId.HarmonyTestnet1,
    name: 'Harmony Testnet Shard 1',
    tag: 'test',
    url: 'https://api.s1.b.hmny.io',
    evmRpcUrls: ['https://api.s1.b.hmny.io'],
    logo: HarmonyLogo,
    currencies: [WebbCurrencyId.ONE],
    nativeCurrencyId: WebbCurrencyId.ONE,
  },
  [InternalChainId.HarmonyMainnet0]: {
    chainType: ChainType.EVM,
    group: 'one',
    id: InternalChainId.HarmonyMainnet0,
    chainId: EVMChainId.HarmonyMainnet0,
    name: 'Harmony Mainnet Shard 0',
    tag: 'live',
    url: 'https://api.harmony.one',
    evmRpcUrls: ['https://api.harmony.one'],
    logo: HarmonyLogo,
    currencies: [WebbCurrencyId.ONE],
    nativeCurrencyId: WebbCurrencyId.ONE,
  },
  [InternalChainId.Shiden]: {
    chainType: ChainType.EVM,
    group: 'sdn',
    id: InternalChainId.Shiden,
    chainId: EVMChainId.Shiden,
    name: 'Shiden',
    tag: 'live',
    url: 'https://shiden.api.onfinality.io/public',
    evmRpcUrls: ['https://shiden.api.onfinality.io/public'],
    blockExplorerStub: 'https://shiden.subscan.io',
    logo: ShidenLogo,
    currencies: [WebbCurrencyId.SDN],
    nativeCurrencyId: WebbCurrencyId.SDN,
  },
};
