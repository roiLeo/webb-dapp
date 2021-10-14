import {
  PolkadotMixerDeposit,
  PolkadotMixerWithdraw,
  PolkaTXBuilder,
} from '@webb-dapp/react-environment/api-providers/polkadot';
import {
  ApiInitHandler,
  WebbApiProvider,
  WebbMethods,
  WebbProviderEvents,
} from '@webb-dapp/react-environment/webb-context';
import { ActionsBuilder, InteractiveFeedback, WebbError, WebbErrorCodes } from '@webb-dapp/utils/webb-error';
import { PolkadotAccounts } from '@webb-dapp/wallet/providers/polkadot/polkadot-accounts';
import { PolkadotProvider } from '@webb-dapp/wallet/providers/polkadot/polkadot-provider';
import { EventBus, LoggerService } from '@webb-tools/app-util';

import { ApiPromise } from '@polkadot/api';
import { InjectedExtension } from '@polkadot/extension-inject/types';
import { WebbRelayerBuilder } from '@webb-dapp/react-environment/webb-context/relayer';

const logger = LoggerService.get('WebbPolkadot');

export class WebbPolkadot extends EventBus<WebbProviderEvents> implements WebbApiProvider<WebbPolkadot> {
  readonly methods: WebbMethods<WebbPolkadot>;
  private readonly provider: PolkadotProvider;
  accounts: PolkadotAccounts;
  readonly api: ApiPromise;
  readonly txBuilder: PolkaTXBuilder;

  private constructor(
    apiPromise: ApiPromise,
    injectedExtension: InjectedExtension,
    readonly relayingManager: WebbRelayerBuilder
  ) {
    super();
    this.provider = new PolkadotProvider(apiPromise, injectedExtension);
    this.accounts = this.provider.accounts;
    this.api = this.provider.api;
    this.txBuilder = this.provider.txBuilder;
    this.methods = {
      bridge: {
        deposit: {
          inner: {} as any,
          enabled: false,
        },
        withdraw: {
          inner: {} as any,
          enabled: false,
        },
      },
      mixer: {
        deposit: {
          inner: new PolkadotMixerDeposit(this),
          enabled: true,
        },
        withdraw: {
          inner: new PolkadotMixerWithdraw(this),
          enabled: true,
        },
      },
    };
  }

  async awaitMetaDataCheck() {
    /// delay some time till the UI is instantiated and then check if the dApp needs to update extension meta data
    await new Promise((r) => setTimeout(r, 3000));
    const metaData = await this.provider.checkMetaDataUpdate();
    if (metaData) {
      /// feedback body
      const feedbackEntries = InteractiveFeedback.feedbackEntries([
        {
          header: 'Update Polkadot MetaData',
        },
      ]);
      /// feedback actions
      const actions = ActionsBuilder.init()
        /// update extension metadata
        .action(
          'Update MetaData',
          async () => {
            await this.provider.updateMetaData(metaData);
            logger.trace('Did update metadata');
          },
          'success'
        )
        .actions();
      const feedback = new InteractiveFeedback('info', actions, () => {}, feedbackEntries);
      /// emit the feedback object
      this.emit('interactiveFeedback', feedback);
      await feedback.wait();
    }
  }

  private async insureApiInterface() {
    // list of required RPC methods
    const REQUIRED_RPC_METHODS = ['mt_getLeaves'];
    // list of required Pallets
    const REQUIRED_PALLETS = ['mixer', 'merkleTree'];
    const methods = await this.api.rpc.rpc.methods();
    const methodsNames = methods.methods.map((method) => method.toString());
    const missingRPCMethods = REQUIRED_RPC_METHODS.filter((method) => !methodsNames.includes(method));
    const missingPalletsQuery = [];
    for (const palletName of REQUIRED_PALLETS) {
      if (typeof this.api.query[palletName] === 'undefined') {
        missingPalletsQuery.push(palletName);
      }
    }
    console.log(this.api.query);
    if (missingRPCMethods.length !== 0 || missingPalletsQuery.length !== 0) {
      throw WebbError.from(WebbErrorCodes.InsufficientProviderInterface);
    }
  }

  static async init(
    appName: string,
    endpoints: string[],
    errorHandler: ApiInitHandler,
    relayerBuilder: WebbRelayerBuilder
  ): Promise<WebbPolkadot> {
    const [apiPromise, injectedExtension] = await PolkadotProvider.getParams(appName, endpoints, errorHandler.onError);

    const instance = new WebbPolkadot(apiPromise, injectedExtension, relayerBuilder);
    instance.on('interactiveFeedback', (e) => {
      errorHandler.onError(e);
    });
    await instance.insureApiInterface();
    /// check metadata update
    await instance.awaitMetaDataCheck();
    await apiPromise.isReady;
    return instance;
  }

  async destroy(): Promise<void> {
    await this.provider.destroy();
  }
}
