const assert = require('assert')
const web3Utils = require('web3-utils')

const generation = require('../dist/index')

describe('Invoice generation unit test', function () {
    it('should create a valid invoice', function () {
        const result = generation.createInvoice({
                networkId: 1,
                hubAddress: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                publicKey: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            },
            1,
        )

        assert(result.hasOwnProperty('uuid'))

        assert.deepEqual(result.destinations.length, 1)
        assert.deepEqual(result.destinations[0].networkId, 1)
        assert(web3Utils.isAddress(result.destinations[0].contractAddress))
        assert.deepEqual(result.destinations[0].walletAddresses.length, 1)
        assert.deepEqual(result.destinations[0].walletAddresses.length, 1)

      console.log(web3Utils)
        assert(result.amount.constructor.name === 'BigNumber')
        assert(result.amount.isEqualTo(1))
        assert(web3Utils.isHex(result.details))
    })

    it('should encode and decode the same invoice', function () {
        const result = generation.createInvoice({
                networkId: 1,
                hubAddress: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
                publicKey: '0x627306090abaB3A6e1400e9345bC60c78a8BEf57',
            },
            1,
        )

        const encoded = generation.encodeInvoice(result)
        const decoded = generation.decodeInvoice(encoded)

        assert.deepEqual(JSON.stringify(result), JSON.stringify(decoded))
    })
})
