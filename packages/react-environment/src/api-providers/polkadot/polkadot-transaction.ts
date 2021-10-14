import { EventBus, LoggerService } from '@webb-tools/app-util';
import { uniqueId } from 'lodash';

import { ApiPromise, SubmittableResult } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/submittable/types';
import { web3FromAddress } from '@polkadot/extension-dapp';
import React from 'react';

type MethodPath = {
  section: string;
  method: string;
};

type PolkadotTXEventsPayload<T = undefined> = {
  data: T;
  key: string;
  address: string;
  path: MethodPath;
};
type PolkadotTXEvents = {
  beforeSend: PolkadotTXEventsPayload;
  afterSend: PolkadotTXEventsPayload;
  failed: PolkadotTXEventsPayload<string>;
  finalize: PolkadotTXEventsPayload;
  inBlock: PolkadotTXEventsPayload;
  extrinsicSuccess: PolkadotTXEventsPayload;
  loading: PolkadotTXEventsPayload<JSX.Element>;
};

export type NotificationConfig = {
  loading?: (data: PolkadotTXEventsPayload<JSX.Element>) => void;
  finalize?: (data: PolkadotTXEventsPayload) => void;
  failed?: (data: PolkadotTXEventsPayload<string>) => void;
};
const txLogger = LoggerService.get('PolkadotTx');

export class PolkadotTx<P extends Array<any>> extends EventBus<PolkadotTXEvents> {
  private notificationKey: string = '';
  private transactionAddress: string | null = null;

  constructor(private apiPromise: ApiPromise, private path: MethodPath, private parms: P) {
    super();
  }

  async call(signAddress: string) {
    this.transactionAddress = signAddress;
    const api = this.apiPromise;
    await api.isReady;
    if (!api.tx[this.path.section] || !api.tx[this.path.section][this.path.method]) {
      txLogger.error(`can not find api.tx.${this.path.section}.${this.path.method}`);
      return;
    }
    const accountInfo = await api.query.system.account(signAddress);
    txLogger.trace(`SignerAddress ${signAddress} ,account info`, accountInfo);
    txLogger.trace(`TX params`, this.parms);
    const injector = await web3FromAddress(signAddress);
    this.notificationKey = uniqueId(`${this.path.section}-${this.path.method}`);
    await api.setSigner(injector.signer);
    const txResults = await api.tx[this.path.section][this.path.method](...this.parms).signAsync(signAddress, {
      nonce: -1,
    });
    this.emitWithPayload('beforeSend', undefined);
    this.emitWithPayload('loading', React.createElement('div'));
    txLogger.trace(`txResults`, txResults);
    await this.send(txResults);

    this.emitWithPayload('afterSend', undefined);
    this.transactionAddress = null;
  }

  protected emitWithPayload<E extends keyof PolkadotTXEvents>(
    event: E,
    data: PolkadotTXEvents[E]['data']
  ): void | Promise<void> {
    this.emit(event, {
      key: this.notificationKey,
      path: this.path,
      address: this.transactionAddress ?? '',
      data: data,
    } as any);
  }

  private errorHandler(r: SubmittableResult) {
    //@ts-ignore
    let message = r.dispatchError?.type || r.type || r.message;
    if (r.dispatchError?.isModule) {
      try {
        const mod = r.dispatchError.asModule;
        const error = this.apiPromise.registry.findMetaError(
          new Uint8Array([mod.index.toNumber(), mod.error.toNumber()])
        );

        message = `${error.section}.${error.name}`;
      } catch (error) {
        message = Reflect.has(error, 'toString') ? error.toString() : error;
      }
    }
    this.emitWithPayload('failed', message);
    return message;
  }

  private send(tx: SubmittableExtrinsic<any>) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      try {
        await tx.send((status) => {
          const { dispatchError, events, status: txStatus } = status;
          txLogger.trace(
            `Completed ${status.isCompleted} , with error ${status.isError} , finalized ${status.isFinalized} , InBlock ${status.isInBlock} ,warning ${status.isWarning}`,
            status.toHuman()
          );
          if (dispatchError) {
            if (dispatchError.isModule) {
              const decoded = this.apiPromise.registry.findMetaError(dispatchError.asModule);
              const { docs, name, section } = decoded;
              const message = `${section}.${name}: ${docs.join(' ')}`;
              this.emitWithPayload('failed', message);
              return reject(message);
            } else {
              this.emitWithPayload('failed', dispatchError.toString());
              return reject(dispatchError.toString());
            }
          }
          if (status.isCompleted) {
            if (status.isError) {
              let message = this.errorHandler(status);
              this.emitWithPayload('failed', message);
              return reject(message);
            }
            if (status.isFinalized) {
              resolve(status.dispatchInfo?.toString());
              return this.emitWithPayload('finalize', undefined);
            }
          }
        });
      } catch (e) {
        const errorMessage = this.errorHandler(e);
        this.emitWithPayload('failed', errorMessage);
        reject(errorMessage);
      }
    });
  }
}

export class PolkaTXBuilder {
  constructor(private apiPromise: ApiPromise, private notificationConfig: NotificationConfig) {}

  buildWithoutNotification<P extends Array<any>>({ method, section }: MethodPath, params: P): PolkadotTx<P> {
    return new PolkadotTx<P>(this.apiPromise.clone(), { method, section }, params);
  }

  build<P extends Array<any>>(path: MethodPath, params: P, notificationConfig?: NotificationConfig): PolkadotTx<P> {
    const tx = this.buildWithoutNotification(path, params);
    const nc = notificationConfig || this.notificationConfig;

    tx.on('loading', (data) => {
      nc.loading?.(data);
    });

    tx.on('finalize', (data) => {
      nc.finalize?.(data);
    });

    tx.on('failed', (data) => {
      nc.failed?.(data);
    });

    return tx;
  }
}
