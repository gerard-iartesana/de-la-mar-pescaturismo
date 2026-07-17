import type { BaseOutputParams, RestNotificationOutputParams, SoapNotificationOutputParams, RequestOutputParams, RestIniciaPeticionOutputParams, RestTrataPeticionOutputParams, ResolvedTransactionTrait } from '../types/output-params';
import type { BaseFormatterOutput, NotificationFormatterOutput, RequestFormatterOutput, RestIniciaPeticionFormatterOutput, RestTrataPeticionFormatterOutput, ResolvedTransactionTraitFormatterOutput } from './types';
export declare const baseOutputFormatter: <RawOutputParams extends BaseOutputParams>(raw: RawOutputParams) => BaseFormatterOutput<RawOutputParams>;
export declare const formatPrice: (params: Omit<ResolvedTransactionTrait, 'Ds_Response'>) => Omit<ResolvedTransactionTraitFormatterOutput, 'response'>;
/**
 * REST notification formatter
 *
 * @public
 */
export declare const restNotificationOutputFormatter: <RawOutputParams extends RestNotificationOutputParams = RestNotificationOutputParams>(raw: RawOutputParams) => NotificationFormatterOutput<RawOutputParams>;
/**
 * SOAP notification formatter
 *
 * @public
 */
export declare const soapNotificationOutputFormatter: <RawOutputParams extends SoapNotificationOutputParams = SoapNotificationOutputParams>(raw: RawOutputParams) => NotificationFormatterOutput<RawOutputParams>;
export declare const requestOutputFormatter: <RawOutputParams extends RequestOutputParams>(raw: RawOutputParams) => RequestFormatterOutput<RawOutputParams>;
/**
 * REST iniciaPeticion output formatter
 *
 * @public
 */
export declare const restIniciaPeticionOutputFormatter: <RawOutputParams extends RestIniciaPeticionOutputParams = RestIniciaPeticionOutputParams>(raw: RawOutputParams) => RestIniciaPeticionFormatterOutput<RawOutputParams>;
/**
 * REST trataPeticion output formatter
 *
 * @public
 */
export declare const restTrataPeticionOutputFormatter: <RawOutputParams extends RestTrataPeticionOutputParams = RestTrataPeticionOutputParams>(raw: RawOutputParams) => RestTrataPeticionFormatterOutput<RawOutputParams>;
