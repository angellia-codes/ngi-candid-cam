/** Public event settings the phone needs. Contains no secrets. */
export type PublicStatus = {
  cameraOpenAt: string;
  cameraCloseAt: string;
  uploadCloseAt: string;
  shotsPerDevice: number;
  consentVersion: string;
  now: string;
};
