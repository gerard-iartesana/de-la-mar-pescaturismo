import type { ResponseJSONSuccess, CommonRawRequestParams, CommonRawResponseParams, SHA256SignedJSONParameters } from '../types/api';
export declare const sha256VerifyJSONResponse: (merchantKey: string, response: ResponseJSONSuccess, responseParams: CommonRawResponseParams) => void;
export declare const sha256SignJSONRequest: (merchantKey: string, serializedParams: string, requestParams: CommonRawRequestParams) => SHA256SignedJSONParameters;
