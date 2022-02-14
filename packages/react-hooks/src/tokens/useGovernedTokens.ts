import { useWebContext } from '@webb-dapp/react-environment';
import { Currency, CurrencyContent } from '@webb-dapp/react-environment/webb-context/currency/currency';
import { WrappingEventNames } from '@webb-dapp/react-environment/webb-context/wrap-unwrap';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * @name useAccounts
 */
export const useGovernedTokens = () => {
  const { activeApi } = useWebContext();

  const [governedToken, setTokenState] = useState<CurrencyContent | null>(null);
  const [governedTokens, setGovernedTokens] = useState<CurrencyContent[]>([]);

  const wrapUnwrapApi = useMemo(() => {
    const w = activeApi?.methods.wrapUnwrap?.core;
    if (w?.enabled) {
      return w.inner;
    }
    return null;
  }, [activeApi]);

  const initTokens = useCallback(() => {
    // Clear any previous state
    if (wrapUnwrapApi) {
      wrapUnwrapApi.getGovernedTokens().then((tokens) => {
        if (tokens) {
          setGovernedTokens(tokens.map((token) => Currency.fromCurrencyId(token)));
        }
      });
    }
  }, [wrapUnwrapApi]);

  const setGovernedToken = useCallback(
    (content: CurrencyContent | null) => {
      if (content?.view.id) {
        wrapUnwrapApi?.setGovernedToken(content.view.id);
      }
    },
    [wrapUnwrapApi]
  );

  useEffect(() => {
    initTokens();
    const r = wrapUnwrapApi?.subscription.subscribe((next) => {
      const key = Object.keys(next)[0] as WrappingEventNames;
      switch (key) {
        case 'ready':
        case 'stateUpdate':
          initTokens();
          break;
        case 'governedTokenUpdate':
          console.log('governedTokenUpdate: ', next.governedTokenUpdate);
          setTokenState(Currency.fromCurrencyId(next.governedTokenUpdate!));
          break;
      }
    });

    return () => r?.unsubscribe();
  }, [initTokens, activeApi, wrapUnwrapApi]);

  return {
    governedToken,
    governedTokens,
    setGovernedToken,
  };
};
