import BigNumber from 'bignumber.js';
export interface Destination {
    networkId: number;
    contractAddress: string;
    walletAddresses: string[];
}
export interface Invoice {
    uuid: string;
    destinations: Destination[];
    amount: BigNumber;
    tokenAddress: string;
    details: string;
    nonce?: number;
}
export declare const deriveReferenceNonce: (invoice: Invoice) => number;
export declare const createInvoice: (receiver: {
    networkId: number;
    hubAddress: string;
    publicKey: string;
}, amount: string | number | BigNumber, details?: string, tokenAddress?: string) => Invoice;
export declare const encodeInvoice: (invoice: Invoice) => string;
export declare const decodeInvoice: (encoded: string) => Invoice;
