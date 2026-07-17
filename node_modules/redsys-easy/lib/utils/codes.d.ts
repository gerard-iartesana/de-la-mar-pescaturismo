/**
 * Returns the message corresponding to a response code, in spanish
 *
 * @public
 */
export declare const getResponseCodeMessage: (code: string | number) => string | undefined;
/**
 * Returns the message corresponding to a gateway error code
 *
 * @public
 */
export declare const getSISErrorCodeMessage: (code: string) => string | undefined;
export declare const getHTTPErrorCodeMessage: (code: number) => string | undefined;
