const BigNumber = require('bignumber.js')
const JSONbig = require('json-bigint')
const atob = require('atob')
const btoa = require('btoa')
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
                contractAddress: receiver.hubAddress,
                walletAddresses: [receiver.publicKey]
            }
        ],
        amount: new BigNumber(amount),
        currency: currency,
        details: web3Utils.soliditySha3(details)
    }

    return {
        invoice: invoice,
        nonce: deriveReferenceNonce(invoice)
    }
}

/**
 * Encode invoice for web use
 * @param invoice {Object} - Invoice
 * @returns {string} - Encoded Invoice
 */
const encodeInvoice = (invoice) => {
    return encodeURIComponent(btoa(JSONbig.stringify(invoice)))
}

/**
 * Decode invoice after web use
 * @param encoded - Encoded Invoice
 * @returns {Object} - Invoice
 */
const decodeInvoice = (encoded) => {
    return JSONbig.parse(atob(decodeURIComponent(encoded)))
}

module.exports = {
    createInvoice: createInvoice,
    decodeInvoice: decodeInvoice,
    encodeInvoice: encodeInvoice
}
