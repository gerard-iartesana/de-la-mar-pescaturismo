import type { ResponseJSONSuccess, CommonRawRequestParams, CommonRawResponseParams, SHA256SignedJSONParameters } from '../types/api';
export declare const deserializeAndVerifyJSONResponse: <ResponseParams extends CommonRawResponseParams>(merchantKey: string, response: ResponseJSONSuccess) => ResponseParams;
export declare const serializeAndSignJSONRequest: <RequestParams extends CommonRawRequestParams>(merchantKey: string, requestParams: RequestParams) => SHA256SignedJSONParameters;
