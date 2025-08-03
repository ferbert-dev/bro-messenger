import { User, IUser } from '../models/userModel';
import { HttpError } from '../utils/httpError';

  export const getAllUsers = async () => {
    return await User.find();
  };

  export const createUser = async (userData: typeof User) => {

    try {
      const user = new User(userData);
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

  export const updateUserById = async (id: string, userData: Partial<IUser>) => {

    const user = await User.findById(id);
    if (!user) {
      throw new HttpError(404, 'User not found');
    }
    // Update the user data
    // Use $set to update only the fields that are provided in userData
    // and $inc to increment the version field (__v)
    // This is useful for optimistic concurrency control
    // and to ensure that the document is not modified by another operation

    // Convert to plain object, spread changes, and assign back to Mongoose doc
    const updated = { ...user.toObject(), ...userData };

    // Now assign values back to the actual Mongoose document
    Object.assign(user, updated);

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
  deleteUserById
};

export default userService;