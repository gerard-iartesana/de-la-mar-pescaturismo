import type { ThreeDSv1ChallengeOutputParams, ThreeDSv2ChallengeOutputParams, ThreeDSv2PreAuthWithMethodOutputParams, ThreeDSMethodData, ThreeDSMethodForm, ThreeDSv1ChallengeForm, ThreeDSv2ChallengeForm, ThreeDSCres } from '../types/3ds-params';
/**
 * Creates parameters for a 3DS method form
 *
 * @public
 */
export declare const create3DSMethodForm: (emv3dsParams: Pick<ThreeDSv2PreAuthWithMethodOutputParams, 'threeDSServerTransID' | 'threeDSMethodURL'>, notificationURL: string) => ThreeDSMethodForm;
/**
 * Creates parameters for a 3DS v1 challenge form
 *
 * @public
 */
export declare const create3DSv1ChallengeForm: (emv3dsV1Challenge: ThreeDSv1ChallengeOutputParams, challengeNotificationUrl: string) => ThreeDSv1ChallengeForm;
/**
 * Creates parameters for a 3DS v2 challenge form
 *
 * @public
 */
export declare const create3DSv2ChallengeForm: (emv3dsV2Challenge: ThreeDSv2ChallengeOutputParams) => ThreeDSv2ChallengeForm;
/**
 * Deserialize threeDSMethodData
 *
 * @public
 */
export declare const deserializeThreeDSMethodData: (threeDSMethodData: string) => ThreeDSMethodData;
/**
 * Deserialize `cres` field of a 3DS v2 challenge
 *
 * @public
 */
export declare const deserializeCres: (cres: string) => ThreeDSCres;
