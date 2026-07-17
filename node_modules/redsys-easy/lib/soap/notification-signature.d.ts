import type { ParsedSoapNotifiation, SoapNotificationResponse } from '../types/api';
export declare const verifySoapNotification: (merchantKey: string, xml: string, msg: ParsedSoapNotifiation['Message']) => void;
export declare const signSoapNotificationResponse: (merchantKey: string, serializedResponse: string, response: SoapNotificationResponse) => string;
