/// <reference types="node" />
/**
 * Adds padding to a buffer.
 *
 * Rounds up the buffer length to the next block and uses 0 as padding.
 *
 * @params buf - Input buffer
 * @params blocksize - Size of block
 */
export declare const zeroPad: (buf: Buffer, blocksize: number) => Buffer;
/**
 * Encrypt a message using 3DES
 *
 * @params key - Key to encrypt message
 * @params message - Message to be encrypted
 */
export declare const encrypt3DES: (key: string, message: string) => Buffer;
/**
 * Compute HMAC_SHA256_V1 signature
 *
 * @params merchantKey - Key to encrypt message
 * @params order - Order number
 * @params params - Payload to sign
 */
export declare const sha256Sign: (merchantKey: string, order: string, params: string) => string;
