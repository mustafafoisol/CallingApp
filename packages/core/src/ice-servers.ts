export interface IceServerConfig {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const GOOGLE_STUN_SERVERS: IceServerConfig[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function mergeIceServers(
  stun: IceServerConfig[],
  turn?: IceServerConfig[],
): IceServerConfig[] {
  return turn ? [...stun, ...turn] : [...stun];
}