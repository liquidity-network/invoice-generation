const BigNumber = require('bignumber.js')
const uuid = require('uuid/v4')
const web3Utils = require('web3-utils')

const destinationChecksum = (invoiceDestination) => {
    const walletAddressesChecksums = invoiceDestination.walletAddresses.map(walletAddress => {
        return {
            type: 'bytes32', value: web3Utils.soliditySha3({
                type: 'address', value: walletAddress
            })
        }
    })

    return web3Utils.soliditySha3({
            type: 'uint256', value: invoiceDestination.networkId
        }, {
            type: 'bytes32', value: web3Utils.soliditySha3({
                type: 'address', value: invoiceDestination.contractAddress
            })
        },
        ...walletAddressesChecksums
    )
}

const deriveReferenceNonce = (invoice) => {
    const destinationsChecksumTargets = invoice.destinations
        .map(destinationChecksum)
        .map(checksum => {
            return {type: 'bytes32', value: checksum}
        })

    const destinationsChecksum = web3Utils.soliditySha3(...destinationsChecksumTargets)

    const invoiceChecksum = web3Utils.soliditySha3(
        {type: 'bytes16', value: invoice.uuid},
        {type: 'bytes32', value: destinationsChecksum},
        {type: 'uint256', value: invoice.amount.toFixed(0)},
        {type: 'bytes4', value: invoice.currency},
        {type: 'bytes32', value: invoice.details},
    )

    const completeNonce = new BigNumber(invoiceChecksum)
    const fragment = new BigNumber(2).pow(32)

    return completeNonce.mod(fragment).toNumber()
}

/**
 * Create a proper invoice and its nonce
 * @param receiver {{networkId: number, contractAddress: string, publicKey: string}} - Details of the receiver
 * @param amount {number} - Amount to be paid in the smallest division supported by the currency
 * @param details {string} - Details to be hashed
 * @param currency {string} - Currency to be used for the payment
 * @returns {{invoice: {uuid: string, destinations: {networkId: number, contractAddress: string, walletAddresses: string[]}[], amount, currency: string, details: string}, nonce: string}}
 */
const createInvoice = (receiver, amount, details = '', currency = 'ETH') => {
    const invoice =  {
        uuid: uuid().split('-').join(''),
        destinations: [
            {
                networkId: receiver.networkId,
                contractAddress: web3Utils.toChecksumAddress(receiver.hubAddress),
                walletAddresses: [web3Utils.toChecksumAddress(receiver.publicKey)]
            }
        ],
        amount: new BigNumber(amount),
        currency: currency,
        details: web3Utils.soliditySha3(details)
    }

    return Object.defineProperty(invoice, 'nonce', { value: deriveReferenceNonce(invoice), enumerable: true })
}

/**
 * Encode invoice for web use
 * @param invoice {Object} - Invoice
 * @returns {string} - Encoded Invoice
 */
const encodeInvoice = (invoice) => {
    // `ethereum:pay-${invoice.dest.walletAddresses[0]}@${invoice.dest.networkId}/transfer?value=${invoice.amount.toString()}&string`
    const data = [
        invoice.uuid,
        invoice.destinations.map(dest => [
            dest.networkId,
            dest.contractAddress,
            dest.walletAddresses.join('#')
        ].join('@')).join('&'),
        invoice.amount.toString(),
        invoice.currency,
        invoice.details,
    ].join('|')
    return data
}

/**
 * Decode invoice after web use
 * @param encoded - Encoded Invoice
 * @returns {Object} - Invoice
 */
const decodeInvoice = (encoded) => {
    const data = encoded.split('|')
    const invoice = {
        uuid: data[0],
        destinations: data[1].split('&').map(dest => {
            const destData = dest.split('@')
            return {
                networkId: Number.parseInt(destData[0]),
                contractAddress: web3Utils.toChecksumAddress(destData[1]),
                walletAddresses: destData[2].split('#').map(web3Utils.toChecksumAddress),
            }
        }),
        amount: new BigNumber(data[2]),
        currency: data[3],
        details: data[4],
    }

    return Object.defineProperty(invoice, 'nonce', { value: deriveReferenceNonce(invoice), enumerable: true })
}

module.exports = {
    createInvoice: createInvoice,
    decodeInvoice: decodeInvoice,
    encodeInvoice: encodeInvoice
}
