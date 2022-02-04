import { ChainId, ChainType, currenciesConfig, WebbCurrencyId } from '@webb-dapp/apps/configs';
import {
  CurrencyConfig,
  CurrencyRole,
  CurrencyType,
  CurrencyView,
} from '@webb-dapp/react-environment/types/currency-config.interface';

export abstract class CurrencyContent {
  abstract get view(): CurrencyView;
}

// This currency class assumes that instances are wrappable assets.
export class Currency extends CurrencyContent {
  constructor(private data: CurrencyConfig) {
    super();
  }

  static fromCurrencyId(currencyId: WebbCurrencyId) {
    const currencyConfig = currenciesConfig[currencyId];
    return new Currency(currencyConfig);
  }

  static isWrappableCurrency(currencyId: WebbCurrencyId) {
    if (currenciesConfig[currencyId].role == CurrencyRole.Wrappable) return true;
    return false;
  }

  getAddress(chain: ChainId): string | undefined {
    return this.data.addresses.get(chain);
  }

  hasChain(chain: ChainId): boolean {
    return this.data.addresses.has(chain);
  }

  getChainIds(): ChainId[] {
    return Array.from(this.data.addresses.keys());
  }

  // TODO: Create a structured type
  // interface ChainIdWithType { chain: ChainId; type: ChainType; }
  getChainIdsAndTypes(): [ChainType, ChainId][] {
    return Array.from(this.data.addresses.keys()).map((chainId) => {
      // TODO: Get the actual chain type from the hardcoded currency config
      return [ChainType.EVM, chainId];
    });
  }

  get view(): CurrencyView {
    return {
      icon: this.data.icon,
      id: this.data.id,
      type: this.data.type,
      name: this.data.name,
      color: this.data.color,
      symbol: this.data.symbol,
    };
  }
}
