import { log } from 'console';
import { User, IUser } from '../models/userModel';
import { HttpError } from '../utils/httpError';
import bcrypt from 'bcryptjs';
import { filterObjectByAllowedKeys } from '../utils/filterObject';

export const getAllUsers = async () => {
  return await User.find();
};

export const getOneByEmail = (emailData: string): Promise<IUser | null> => {
  return User.findOne({ email: emailData }).lean();
};

export async function checkIfUserExistBeEmail(email: string): Promise<void> {
  const current = await getOneByEmail(email);
  if (current) {
    throw new HttpError(409, 'Email already exists');
  }
}

export const createUser = async (userData: IUser) => {
  try {
    const role = 'user';
    const email: string = userData.email;
    // Duplicate email
    await checkIfUserExistBeEmail(email);

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = new User({
      email: email,
      password: hashedPassword,
      name: userData.name,
      role: role,
      age: userData.age,
    });

    return await user.save();
  } catch (err: any) {
    // Duplicate email
    if (err.code === 11000 && err.keyPattern?.email) {
      throw new HttpError(409, 'Email already exists');
    }
    // Pass other errors up
    throw err;
  }
};

export const getUserById = async (id: string) => {
  return await User.findById(id);
};

const allowedUserUpdateFields = ['name', 'age'] as const;
type AllowedUserUpdateField = (typeof allowedUserUpdateFields)[number];
type UserUpdateDto = Partial<Pick<IUser, AllowedUserUpdateField>>;

export const updateUserById = async (id: string, userData: UserUpdateDto) => {
  const user = await User.findById(id);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }
  // Update the user data
  // Use $set to update only the fields that are provided in userData
  // and $inc to increment the version field (__v)
  // This is useful for optimistic concurrency control
  // and to ensure that the document is not modified by another operation

  // Filter only allowed fields from userData
  const filteredData = filterObjectByAllowedKeys(
    userData,
    allowedUserUpdateFields,
  );
  // Assign values back to the actual Mongoose document
  Object.assign(user, filteredData);

  // Save – triggers validation and version bump
  const savedUser = await user.save();

  return savedUser;
};

export const deleteUserById = async (id: string) => {
  return await User.findByIdAndDelete(id);
};

export const userService = {
  getAllUsers,
  createUser,
  getUserById,
  updateUserById,
  deleteUserById,
  getOneByEmail,
  checkIfUserExistBeEmail,
};

export default userService;
