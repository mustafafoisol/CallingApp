export interface IncomingPendingRequest {
  friendshipId: string;
  peerId: string;
  displayName: string | null;
  publicId: string;
  avatarUrl: string | null;
}

export interface OutgoingPendingRequest {
  friendshipId: string;
  peerId: string;
  displayName: string | null;
  publicId: string;
  avatarUrl: string | null;
}