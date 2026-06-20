import { Request, Response } from 'express';
import { User } from '../models/User'; // Adjust path based on your file structure

/**
 * @desc    Get all users (Safe version - passwords excluded)
 * @route   GET /api/users
 * @access  Private/Admin (Recommended)
 */
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all users but explicitly exclude the password field
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to retrieve users.',
    });
  }
};