import type { RedirectInputParams, RequestInputParams, RestIniciaPeticionInputParams, RestTrataPeticionInputParams } from '../types/input-params';
import type { RedirectFormatterInput, RequestFormatterInput, RestIniciaPeticionFormatterInput, RestTrataPeticionFormatterInput } from './types';
/**
 * Redirection input formatter
 *
 * @public
 */
export declare const redirectInputFormatter: <RawInputParams extends Partial<RedirectInputParams> = Partial<RedirectInputParams>>(input: RedirectFormatterInput<RawInputParams>) => RedirectInputParams;
export declare const requestInputFormatter: <RawInputParams extends Partial<RequestInputParams>>(input: RequestFormatterInput<RawInputParams>) => RequestInputParams;
/**
 * REST iniciaPeticion input formatter
 *
 * @public
 */
export declare const restIniciaPeticionInputFormatter: <RawInputParams extends Partial<RestIniciaPeticionInputParams> = Partial<RestIniciaPeticionInputParams>>(raw: RestIniciaPeticionFormatterInput<RawInputParams>) => RestIniciaPeticionInputParams;
/**
 * REST trataPeticion input formatter
 *
 * @public
 */
export declare const restTrataPeticionInputFormatter: <RawInputParams extends Partial<RestTrataPeticionInputParams> = Partial<RestTrataPeticionInputParams>>(raw: RestTrataPeticionFormatterInput<RawInputParams>) => RestTrataPeticionInputParams;
