interface CreateChatRequest {
  title?: string;
  adminId: string;
  participantIds: string[];
  avatarImage?: string;
  avatarUrl?: string;
}
