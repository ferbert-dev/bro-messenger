import userService from '../userService';
import { User } from '../../models/userModel';
import { HttpError } from '../../utils/httpError';

jest.mock('../../models/userModel', () => {
  const mockSave = jest.fn();
  const mockFindById = jest.fn();
  const mockFindOne = jest.fn();

  const User = Object.assign(
    jest.fn().mockImplementation(() => ({
      save: mockSave,
    })),
    {
      findById: mockFindById,
      findOne: mockFindOne,
    },
  );

  return {
    __esModule: true,
    User,
    default: User,
    mockSave,
    mockFindById,
    mockFindOne,
  };
});

const { mockSave, mockFindById, mockFindOne } = jest.requireMock(
  '../../models/userModel',
);

describe('createUser', () => {
  const mockUserData = { name: 'Igor', email: 'igor@example.com', age: 30 };
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('should create and return a user successfully', async () => {
    mockFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    mockSave.mockResolvedValue({ _id: '1', ...mockUserData });

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
    mockFindOne.mockReturnValue({
      lean: () => Promise.resolve({ _id: 'existing' }),
    });
    mockSave.mockRejectedValue(duplicateError);

    await expect(userService.createUser(mockUserData as any)).rejects.toThrow(
      HttpError,
    );
    await expect(userService.createUser(mockUserData as any)).rejects.toThrow(
      'Email already exists',
    );
  });

  it('should throw a generic error for other issues', async () => {
    mockFindOne.mockReturnValue({ lean: () => Promise.resolve(null) });
    mockSave.mockRejectedValue(new Error('Database failure'));

    await expect(userService.createUser(mockUserData as any)).rejects.toThrow(
      'Database failure',
    );
  });
});

describe('updateUserById (mocked)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });
  beforeEach(() => {
    // Define & override the static method
    mockFindById.mockClear();
  });

  it('should update user and save', async () => {
    // Setup mocks
    const saveMock = jest.fn().mockResolvedValue({
      name: 'Igor',
      age: 31,
      email: 'igor@mock.com',
      __v: 1,
    });
    mockFindById.mockResolvedValue({
      toObject: () => ({
        name: 'Igor',
        age: 30,
        email: 'igor@mock.com',
        __v: 0,
      }),
      save: saveMock,
    });

    const result = await userService.updateUserById('fakeid', { age: 31 });
    expect(result.age).toBe(31);
    expect(saveMock).toHaveBeenCalled();
  });

  it('should throw 404 if user not found', async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      userService.updateUserById('fakeid', { name: 'Nobody' }),
    ).rejects.toThrow('User not found');
  });
});

describe('getUserById', () => {
  const userId = 'abc123';
  const mockUser = { _id: userId, name: 'Igor', email: 'igor@example.com' };

  beforeEach(() => {
    // Define & override the static method
    mockFindById.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the user if found', async () => {
    mockFindById.mockResolvedValue(mockUser);

    const result = await userService.getUserById(userId);

    expect(mockFindById).toHaveBeenCalledWith(userId);
    expect(result).toEqual(mockUser);
  });

  it('should return null if user is not found', async () => {
    mockFindById.mockResolvedValue(null);

    const result = await userService.getUserById(userId);

    expect(mockFindById).toHaveBeenCalledWith(userId);
    expect(result).toBeNull();
  });
});
