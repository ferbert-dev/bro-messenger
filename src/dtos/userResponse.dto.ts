export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';
}

export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'guest';

  constructor(user: any) {
    this.id = user._id?.toString() || user.id;
    this.email = user.email;
    this.name = user.name;
    this.role = user.role;
  }
}
