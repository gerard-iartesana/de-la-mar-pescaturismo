import type { SoapNotificationResponse } from '../types/api';
import type { SoapNotificationOutputParams } from '../types/output-params';
export declare const serializeAndSignSoapNotificationResponse: (merchantKey: string, response: SoapNotificationResponse) => string;
export declare const deserializeAndVerifySoapNotification: (merchantKey: string, xml: string) => SoapNotificationOutputParams;
