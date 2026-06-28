export interface ParticipantPair {
  userAId: string;
  userBId: string;
}

export function canonicalizeParticipants(
  userId1: string,
  userId2: string,
): ParticipantPair {
  if (userId1 === userId2) {
    throw new Error("Cannot create a conversation with the same user");
  }
  return userId1 < userId2
    ? { userAId: userId1, userBId: userId2 }
    : { userAId: userId2, userBId: userId1 };
}

export function isConversationParticipant(
  conversation: ParticipantPair,
  userId: string,
): boolean {
  return conversation.userAId === userId || conversation.userBId === userId;
}