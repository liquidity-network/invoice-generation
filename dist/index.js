"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var web3_utils_1 = require("web3-utils");
var bignumber_js_1 = __importDefault(require("bignumber.js"));
var v4_1 = __importDefault(require("uuid/v4"));
var destinationChecksum = function (invoiceDestination) {
    var walletAddressesChecksums = invoiceDestination.walletAddresses.map(function (walletAddress) {
        return {
            type: 'bytes32',
            value: web3_utils_1.soliditySha3({
                type: 'address',
                value: walletAddress,
            }),
        };
    });
    return web3_utils_1.soliditySha3.apply(void 0, [{
            type: 'uint256',
            value: invoiceDestination.networkId.toString(),
        },
        {
            type: 'bytes32',
            value: web3_utils_1.soliditySha3({
                type: 'address',
                value: invoiceDestination.contractAddress,
            }),
        }].concat(walletAddressesChecksums));
};
exports.deriveReferenceNonce = function (invoice) {
    var destinationsChecksumTargets = invoice.destinations
        .map(destinationChecksum)
        .map(function (checksum) { return ({ type: 'bytes32', value: checksum }); });
    var destinationsChecksum = web3_utils_1.soliditySha3.apply(void 0, destinationsChecksumTargets);
    var invoiceChecksum = web3_utils_1.soliditySha3({ type: 'bytes16', value: invoice.uuid }, { type: 'bytes32', value: destinationsChecksum }, { type: 'uint256', value: invoice.amount.toFixed(0) }, { type: 'bytes32', value: invoice.tokenAddress }, { type: 'bytes32', value: invoice.details });
    var completeNonce = new bignumber_js_1.default(invoiceChecksum);
    var fragment = new bignumber_js_1.default(2).pow(32);
    return completeNonce.mod(fragment).toNumber();
};
exports.createInvoice = function (receiver, amount, details, tokenAddress) {
    if (details === void 0) { details = ''; }
    if (typeof tokenAddress === 'undefined') {
        tokenAddress = receiver.hubAddress;
    }
    var invoice = {
        uuid: v4_1.default()
            .split('-')
            .join(''),
        destinations: [
            {
                networkId: receiver.networkId,
                contractAddress: web3_utils_1.toChecksumAddress(receiver.hubAddress),
                walletAddresses: [web3_utils_1.toChecksumAddress(receiver.publicKey)],
            },
        ],
        amount: new bignumber_js_1.default(amount),
        tokenAddress: tokenAddress,
        details: web3_utils_1.soliditySha3(details),
    };
    invoice.nonce = exports.deriveReferenceNonce(invoice);
    return invoice;
};
exports.encodeInvoice = function (invoice) {
    return [
        invoice.uuid,
        invoice.destinations
            .map(function (dest) {
            return [dest.networkId, dest.contractAddress, dest.walletAddresses.join('#')].join('@');
        })
            .join('&'),
        invoice.amount.toString(),
        invoice.tokenAddress,
        invoice.details,
    ].join('|');
};
exports.decodeInvoice = function (encoded) {
    var data = encoded.split('|');
    var invoice = {
        uuid: data[0],
        destinations: data[1].split('&').map(function (dest) {
            var destData = dest.split('@');
            return {
                networkId: Number.parseInt(destData[0]),
                contractAddress: web3_utils_1.toChecksumAddress(destData[1]),
                walletAddresses: destData[2].split('#').map(function (a) { return web3_utils_1.toChecksumAddress(a); }),
            };
        }),
        amount: new bignumber_js_1.default(data[2]),
        tokenAddress: data[3],
        details: data[4],
    };
    invoice.nonce = exports.deriveReferenceNonce(invoice);
    return invoice;
};
//# sourceMappingURL=index.js.map