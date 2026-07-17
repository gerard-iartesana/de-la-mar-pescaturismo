import type { CommonRawRequestParams, CommonRawResponseParams } from '../types/api';
export declare const jsonRequest: <RequestParams extends CommonRawRequestParams, ResponseParams extends CommonRawResponseParams>(url: string, merchantKey: string, rawRequestParams: RequestParams) => Promise<ResponseParams>;
