import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import { HttpError } from '../utils/httpError';

export const getUsers = async (req: Request, res: Response) => {

    const users = await userService.getAllUsers();
    res.json(users);

};

export const createUser = async (req: Request, res: Response) => {
    
    console.log(req.body);
    const userData = req.body;
    const newUser = await userService.createUser(userData);

    if (!newUser) {
        throw new HttpError(400, 'Failed to create user');
    }
    res.status(201).json(newUser);
};

export const getUserById = async (req: Request, res: Response) => {

    const userId = req.params.id;
    const user = await userService.getUserById(userId);
    if (!user) {
         throw new HttpError(404, 'User not found');
    }
    res.json(user);
    
};

export const updateUserById = async (req: Request, res: Response) => {

    const userId = req.params.id;
    const userData = req.body;
    const updatedUser = await userService.updateUserById(userId, userData);
    if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(updatedUser);
};

export const deleteUserById = async (req: Request, res: Response) => {

    const userId = req.params.id;
    const deletedUser = await userService.deleteUserById(userId);
    if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
    }
    res.status(204).send();
};
