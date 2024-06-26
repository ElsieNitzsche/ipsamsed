import { type Chain } from 'viem'
import { hexToString } from 'viem'
import {
  type WaitForTransactionReceiptErrorType as viem_WaitForTransactionReceiptErrorType,
  type WaitForTransactionReceiptParameters as viem_WaitForTransactionReceiptParameters,
  type WaitForTransactionReceiptReturnType as viem_WaitForTransactionReceiptReturnType,
  call,
  getTransaction,
  waitForTransactionReceipt as viem_waitForTransactionReceipt,
} from 'viem/actions'

import { type Config } from '../createConfig.js'
import { type SelectChains } from '../types/chain.js'
import { type ChainIdParameter } from '../types/properties.js'
import { type Evaluate, type IsNarrowable } from '../types/utils.js'
import { getAction } from '../utils/getAction.js'

export type WaitForTransactionReceiptParameters<
  config extends Config = Config,
  chainId extends config['chains'][number]['id'] = config['chains'][number]['id'],
> = Evaluate<
  viem_WaitForTransactionReceiptParameters & ChainIdParameter<config, chainId>
>

export type WaitForTransactionReceiptReturnType<
  config extends Config = Config,
  chainId extends config['chains'][number]['id'] = config['chains'][number]['id'],
  ///
  chains extends readonly Chain[] = SelectChains<config, chainId>,
> = Evaluate<
  {
    [key in keyof chains]: viem_WaitForTransactionReceiptReturnType<
      IsNarrowable<chains[key], Chain> extends true ? chains[key] : undefined
    > & { chainId: chains[key]['id'] }
  }[number]
>

export type WaitForTransactionReceiptErrorType =
  viem_WaitForTransactionReceiptErrorType

export async function waitForTransactionReceipt<
  config extends Config,
  chainId extends config['chains'][number]['id'],
>(
  config: config,
  parameters: WaitForTransactionReceiptParameters<config, chainId>,
): Promise<WaitForTransactionReceiptReturnType<config, chainId>> {
  const { chainId, timeout = 0, ...rest } = parameters

  const client = config.getClient({ chainId })
  const action = getAction(
    client,
    viem_waitForTransactionReceipt,
    'waitForTransactionReceipt',
  )
  const receipt = await action({ ...rest, timeout })

  if (receipt.status === 'reverted') {
    const action_getTransaction = getAction(
      client,
      getTransaction,
      'getTransaction',
    )
    const txn = await action_getTransaction({ hash: receipt.transactionHash })
    const action_call = getAction(client, call, 'call')
    const code = (await action_call({
      ...txn,
      gasPrice: txn.type !== 'eip1559' ? txn.gasPrice : undefined,
      maxFeePerGas: txn.type === 'eip1559' ? txn.maxFeePerGas : undefined,
      maxPriorityFeePerGas:
        txn.type === 'eip1559' ? txn.maxPriorityFeePerGas : undefined,
    })) as unknown as string
    const reason = hexToString(`0x${code.substring(138)}`)
    throw new Error(reason)
  }

  return { ...receipt, chainId: client.chain.id }
}
