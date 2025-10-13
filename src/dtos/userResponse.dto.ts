export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  avatarUrl?: string;
}

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
  avatarUrl?: string;

  constructor(user: any) {
    this.id = user._id?.toString() || user.id;
    this.email = user.email;
    this.name = user.name;
    this.role = user.role;
    this.avatarUrl = user.avatarUrl;
  }
}

export class UserWithoutRoleResponseDto {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;

  constructor(user: any) {
    this.id = user._id?.toString() || user.id;
    this.email = user.email;
    this.name = user.name;
    this.avatarUrl = user.avatarUrl;
  }
}
