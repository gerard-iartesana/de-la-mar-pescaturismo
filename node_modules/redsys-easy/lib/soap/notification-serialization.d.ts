import type { ParsedSoapNotifiation, SoapNotificationResponse } from '../types/api';
export declare const serializeSoapNotificationResponse: ({ allow: allowOperation }: SoapNotificationResponse) => string;
export declare const deserializeSoapNotification: (xml: string) => ParsedSoapNotifiation['Message'];
