import { UserWithoutRoleResponseDto } from './userResponse.dto';

export interface ChatResponse {
  id: string;
  title: string;
  avatarUrl?: string;
  admins: UserWithoutRoleResponseDto[];
  members: UserWithoutRoleResponseDto[];
}

export class ChatResponseDto implements ChatResponse {
  id: string;
  title: string;
  avatarUrl?: string;
  admins: UserWithoutRoleResponseDto[];
  members: UserWithoutRoleResponseDto[];

  constructor(chat: any) {
    this.id = chat._id?.toString() || chat.id;
    this.title = chat.title;
    this.avatarUrl = chat.avatarUrl;
    this.admins = Array.isArray(chat.admins)
      ? chat.admins.map((admin: any) => new UserWithoutRoleResponseDto(admin))
      : [];
    this.members = Array.isArray(chat.participants)
      ? chat.participants.map(
          (member: any) => new UserWithoutRoleResponseDto(member),
        )
      : [];
  }
}
