import { useWebContext } from '@webb-dapp/react-environment';
import { Currency, CurrencyContent } from '@webb-dapp/react-environment/webb-context/currency/currency';
import { WrappingEventNames } from '@webb-dapp/react-environment/webb-context/wrap-unwrap';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * @name useAccounts
 */
export const useWrappableTokens = () => {
  const { activeApi } = useWebContext();

  const [wrappableToken, setTokenState] = useState<Currency | null>(null);
  const [wrappableTokens, setWrappableTokens] = useState<Currency[]>([]);

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
      wrapUnwrapApi.getWrappableTokens().then((tokens) => {
        if (tokens) {
          console.log('Init tokens wrappable: ', tokens);
          setWrappableTokens(tokens);
        }
      });
    }
  }, [wrapUnwrapApi]);

  const setWrappableToken = useCallback(
    (content: Currency | null) => {
      if (content?.view.id) {
        wrapUnwrapApi?.setWrappableToken(content);
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
        case 'wrappableTokenUpdate':
          console.log('wrappableTokenUpdate: ', next.wrappableTokenUpdate);
          setTokenState(next.wrappableTokenUpdate!);
          break;
      }
    });

    return () => r?.unsubscribe();
  }, [initTokens, activeApi, wrapUnwrapApi]);

  return {
    wrappableToken,
    wrappableTokens,
    setWrappableToken,
  };
};
