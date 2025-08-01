import  userService  from '../userService';
import { User } from '../../models/userModel';
import { HttpError } from '../../utils/httpError';

jest.mock('../../models/userModel', () => {
  return {
    User: jest.fn().mockImplementation(() => ({
      save: jest.fn(),
    })),
  };
});

describe('createUser', () => {
  const mockUserData = { name: 'Igor', email: 'igor@example.com', age: 30 };
  afterEach(() => {
    jest.clearAllMocks();
  });
   it('should create and return a user successfully', async () => {
    const mockSave = jest.fn().mockResolvedValue({ _id: '1', ...mockUserData });
    (User as unknown as jest.Mock).mockImplementation(() => ({ save: mockSave }));

    const result = await userService.createUser(mockUserData as any);

    expect(result).toEqual({ _id: '1', ...mockUserData });
    expect(User).toHaveBeenCalledWith(mockUserData);
    expect(mockSave).toHaveBeenCalled();
  });
 it('should throw HttpError if email already exists', async () => {
    const duplicateError = {
      code: 11000,
      keyPattern: { email: 1 },
    };
    const mockSave = jest.fn().mockRejectedValue(duplicateError);
    (User as unknown as jest.Mock).mockImplementation(() => ({ save: mockSave }));

    await expect(userService.createUser(mockUserData as any)).rejects.toThrow(HttpError);
    await expect(userService.createUser(mockUserData as any)).rejects.toThrow('Email already exists');
  });

 it('should throw a generic error for other issues', async () => {
    const otherError = new Error('Database failure');
    const mockSave = jest.fn().mockRejectedValue(otherError);
    (User as unknown as jest.Mock).mockImplementation(() => ({ save: mockSave }));

    await expect(userService.createUser(mockUserData as any)).rejects.toThrow('Database failure');
  });
});

describe('updateUserById (mocked)', () => {
afterEach(() => {
    jest.clearAllMocks();
  });
   beforeEach(() => {
    // Define & override the static method
    (User as any).findById = jest.fn();
  });

  it('should update user and save', async () => {
    // Setup mocks
    const saveMock = jest.fn().mockResolvedValue({
      name: 'Igor',
      age: 31,
      email: 'igor@mock.com',
      __v: 1,
    });
    (User.findById as any).mockResolvedValue({
      toObject: () => ({ name: 'Igor', age: 30, email: 'igor@mock.com', __v: 0 }),
      save: saveMock,
    });

    const result = await userService.updateUserById('fakeid', { age: 31 });
    expect(result.age).toBe(31);
    expect(saveMock).toHaveBeenCalled();
  });

  it('should throw 404 if user not found', async () => {
    (User.findById as any).mockResolvedValue(null);

    await expect(userService.updateUserById('fakeid', { name: 'Nobody' }))
      .rejects
      .toThrow('User not found');
  });
});
 
describe('getUserById', () => {
  const userId = 'abc123';
  const mockUser = { _id: userId, name: 'Igor', email: 'igor@example.com' };

  beforeEach(() => {
    // Define & override the static method
    (User as any).findById = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the user if found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    const result = await userService.getUserById(userId);

    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(mockUser);
  });

  it('should return null if user is not found', async () => {
    (User.findById as jest.Mock).mockResolvedValue(null);

    const result = await userService.getUserById(userId);

    expect(User.findById).toHaveBeenCalledWith(userId);
    expect(result).toBeNull();
  });
});