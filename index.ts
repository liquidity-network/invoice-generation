import BigNumber from 'bignumber.js'
import uuid from 'uuid/v4'
import { soliditySha3, toChecksumAddress } from 'web3-utils'

export interface Destination {
  networkId: number
  contractAddress: string
  walletAddresses: string[]
}

export interface Invoice {
  uuid: string
  destinations: Destination[]
  amount: BigNumber
  tokenAddress: string
  details: string
  nonce?: number
}

const destinationChecksum = (invoiceDestination: Destination) => {
  const walletAddressesChecksums = invoiceDestination.walletAddresses.map(walletAddress => {
    return {
      type: 'bytes32',
      value: soliditySha3({
        type: 'address',
        value: walletAddress,
      }),
    }
  })

  return soliditySha3(
    {
      type: 'uint256',
      value: invoiceDestination.networkId.toString(),
    },
    {
      type: 'bytes32',
      value: soliditySha3({
        type: 'address',
        value: invoiceDestination.contractAddress,
      }),
    },
    ...walletAddressesChecksums,
  )
}

/**
 * From an invoice computes its nonce without nonce attribute
 * @param invoice
 */
export const deriveReferenceNonce = (invoice: Invoice): number => {
  const destinationsChecksumTargets = invoice.destinations
    .map(destinationChecksum)
    .map(checksum => {
      return { type: 'bytes32', value: checksum }
    })

  const destinationsChecksum = soliditySha3(...destinationsChecksumTargets)

  const invoiceChecksum = soliditySha3(
    { type: 'bytes16', value: invoice.uuid },
    { type: 'bytes32', value: destinationsChecksum },
    { type: 'uint256', value: invoice.amount.toFixed(0) },
    { type: 'bytes32', value: invoice.tokenAddress },
    { type: 'bytes32', value: invoice.details },
  )

  const completeNonce = new BigNumber(invoiceChecksum)
  const fragment = new BigNumber(2).pow(32)

  return completeNonce.mod(fragment).toNumber()
}

/**
 * Create a proper invoice and its nonce
 * @param receiver - Details of the receiver
 * @param amount - Amount to be paid in the smallest division supported by the tokenAddress
 * @param details - Details to be hashed
 * @param tokenAddress - tokenAddress to be used for the payment
 * @returns Invoice
 */
export const createInvoice = (
  receiver: { networkId: number; hubAddress: string; publicKey: string },
  amount: number | string | BigNumber,
  details = '',
  tokenAddress?: string,
): Invoice => {
  if (typeof tokenAddress === 'undefined') {
    tokenAddress = receiver.hubAddress
  }
  const invoice: Invoice = {
    uuid: uuid()
      .split('-')
      .join(''),
    destinations: [
      {
        networkId: receiver.networkId,
        contractAddress: toChecksumAddress(receiver.hubAddress),
        walletAddresses: [toChecksumAddress(receiver.publicKey)],
      },
    ],
    amount: new BigNumber(amount),
    tokenAddress: tokenAddress,
    details: soliditySha3(details),
  }

  invoice.nonce = deriveReferenceNonce(invoice)

  return invoice
}

/**
 * Encode invoice for web use
 * @param invoice - Invoice
 * @returns Encoded Invoice
 */
export const encodeInvoice = (invoice: Invoice): string => {
  // `ethereum:pay-${invoice.dest.walletAddresses[0]}@${invoice.dest.networkId}/transfer?value=${invoice.amount.toString()}&string`
  return [
    invoice.uuid,
    invoice.destinations
      .map(dest =>
        [dest.networkId, dest.contractAddress, dest.walletAddresses.join('#')].join('@'),
      )
      .join('&'),
    invoice.amount.toString(),
    invoice.tokenAddress,
    invoice.details,
  ].join('|')
}

/**
 * Decode invoice after web use
 * @param encoded - Encoded Invoice
 * @returns Invoice
 */
export const decodeInvoice = (encoded: string): Invoice => {
  const data = encoded.split('|')
  const invoice: Invoice = {
    uuid: data[0],
    destinations: data[1].split('&').map(dest => {
      const destData = dest.split('@')
      return {
        networkId: Number.parseInt(destData[0]),
        contractAddress: toChecksumAddress(destData[1]),
        walletAddresses: destData[2].split('#').map(toChecksumAddress),
      }
    }),
    amount: new BigNumber(data[2]),
    tokenAddress: data[3],
    details: data[4],
  }

  invoice.nonce = deriveReferenceNonce(invoice)

  return invoice
}
