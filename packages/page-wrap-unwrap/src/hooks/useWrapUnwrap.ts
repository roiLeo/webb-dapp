import { useWebContext } from '@webb-dapp/react-environment';
import { useGovernedTokens } from '@webb-dapp/react-hooks/tokens/useGovernedTokens';
import { useWrappableTokens } from '@webb-dapp/react-hooks/tokens/useWrappableTokens';
import { LoggerService } from '@webb-tools/app-util';
import { useCallback, useMemo, useState } from 'react';
const logger = LoggerService.get('useWrapUnwrap');

export function useWrapUnwrap() {
  const { activeApi } = useWebContext();
  const { setWrappableToken, wrappableToken, wrappableTokens } = useWrappableTokens();
  const { governedToken, governedTokens, setGovernedToken } = useGovernedTokens();

  const [context, setContext] = useState<'wrap' | 'unwrap'>('wrap');
  const [amount, setAmount] = useState<number>(0);

  const wrapUnwrapApi = useMemo(() => {
    const w = activeApi?.methods.wrapUnwrap?.core;
    logger.log(w);
    if (w?.enabled) {
      return w.inner;
    }
    return null;
  }, [activeApi]);

  const swap = useCallback(() => {
    setContext(context === 'wrap' ? 'unwrap' : 'wrap');
  }, [context]);

  const execute = useCallback(() => {
    switch (context) {
      case 'wrap':
        return wrapUnwrapApi?.wrap({ amount });
      case 'unwrap':
        return wrapUnwrapApi?.unwrap({ amount });
    }
  }, [context, wrapUnwrapApi, amount]);

  return {
    wrappableToken,
    wrappableTokens,
    setWrappableToken,
    governedToken,
    governedTokens,
    setGovernedToken,
    amount,
    context,
    execute,
    swap,
    setAmount,
  };
}
