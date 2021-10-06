import { useWebContext, WithdrawState } from '@webb-dapp/react-environment/webb-context';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActiveWebbRelayer, WebbRelayer } from '@webb-dapp/react-environment';
import { Note } from '@webb-tools/sdk-mixer';
import { LoggerService } from '@webb-tools/app-util';

export type UseWithdrawProps = {
  note: string;
  recipient: string;
};
export type WithdrawErrors = {
  error: string;

  validationError: {
    note: string;
    recipient: string;
  };
};
const logger = LoggerService.get('useBridgeWithdrawHook');

type RelayersState = {
  relayers: WebbRelayer[];
  loading: boolean;
  activeRelayer: null | ActiveWebbRelayer;
};
const relayersInitState: RelayersState = {
  relayers: [],
  activeRelayer: null,
  loading: true,
};
export const useWithdraw = (params: UseWithdrawProps) => {
  const [stage, setStage] = useState<WithdrawState>(WithdrawState.Ideal);
  const { activeApi } = useWebContext();
  const [relayersState, setRelayersState] = useState<RelayersState>(relayersInitState);

  const [error, setError] = useState<WithdrawErrors>({
    error: '',
    validationError: {
      note: '',
      recipient: '',
    },
  });
  const withdrawApi = useMemo(() => {
    const withdraw = activeApi?.methods.bridge.withdraw;
    if (!withdraw?.enabled) return null;
    return withdraw.inner;
  }, [activeApi]);

  useEffect(() => {
    Note.deserialize(params.note)
      .then((n) => {
        if (n) {
          console.log(n);
          withdrawApi?.getRelayersByNote(n).then((r) => {
            console.log(r);

            setRelayersState((p) => ({
              ...p,
              loading: false,
              relayers: r,
            }));
          });
        }
      })
      .catch((err) => {
        logger.info('catch note deserialize useWithdraw', err);
      });
  }, [params.note]);

  // hook events
  useEffect(() => {
    const sub = withdrawApi?.watcher.subscribe((next) => {
      setRelayersState((p) => ({
        ...p,
        activeRelayer: next,
      }));
    });

    const unsubscribe: Record<string, (() => void) | void> = {};
    if (!withdrawApi) return;
    unsubscribe['stateChange'] = withdrawApi.on('stateChange', (stage: WithdrawState) => {
      setStage(stage);
    });

    unsubscribe['validationError'] = withdrawApi.on('validationError', (validationError) => {
      setError((p) => ({
        ...p,
        validationError,
      }));
    });
    unsubscribe['error'] = withdrawApi.on('error', (withdrawError) => {
      setError((p) => ({
        ...p,
        error: withdrawError,
      }));
    });

    return () => {
      Object.values(unsubscribe).forEach((v) => v && v());
      sub?.unsubscribe();
    };
  }, [withdrawApi]);

  const withdraw = useCallback(async () => {
    if (!withdrawApi) return;

    if (stage === WithdrawState.Ideal) {
      const { note, recipient } = params;
      await withdrawApi.withdraw(note, recipient);
    }
  }, [withdrawApi, params, stage]);

  const canCancel = useMemo(() => {
    return stage < WithdrawState.SendingTransaction && stage > WithdrawState.Ideal;
  }, [stage]);

  const cancelWithdraw = useCallback(async () => {
    if (canCancel) {
      await withdrawApi?.cancelWithdraw();
    }
  }, [canCancel, withdrawApi]);

  const setRelayer = useCallback(
    (nextRelayer: WebbRelayer | null) => {
      withdrawApi?.setActiveRelayer(nextRelayer);
    },
    [withdrawApi]
  );

  return {
    stage,
    withdraw,
    canCancel,
    cancelWithdraw,
    error: error.error,
    validationErrors: error.validationError,
    relayersState,
    setRelayer,
  };
};
