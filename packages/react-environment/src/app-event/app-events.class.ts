import { WalletId } from '@webb-dapp/apps/configs';
// @ts-ignore
import { Account } from '@webb-dapp/wallet/account/Accounts.adapter';
import { Chain, InternalChainId, Wallet } from '@webb-tools/api-providers';
import { EventBus } from '@webb-tools/app-util';

export type AppEvents = {
  changeNetworkSwitcherVisibility: boolean;
  networkSwitched: [InternalChainId, WalletId];
  switchNetwork: [Chain, Wallet];
  setActiveAccount: Account;
};

class AppEvent extends EventBus<AppEvents> {
  public readonly send: <E extends keyof AppEvents>(event: E, data: AppEvents[E]) => void | Promise<void>;

  constructor() {
    super();
    this.send = this.emit;
  }
}

export type TAppEvent = InstanceType<typeof AppEvent>;
export const appEvent = new AppEvent();
