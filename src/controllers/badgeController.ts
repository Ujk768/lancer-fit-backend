import { Request, Response } from 'express';
import UserBadge from '../models/UserBadge';
import Badge from '../models/Badges';

/**
 * @desc    Get all badges
 * @route   GET /api/badges
 * @access  Public
 */
export const getAllBadges = async (req: Request, res: Response): Promise<void> => {
  try {
    // Fetch all records from the badges table
    const badges = await Badge.findAll();

    // Respond with a 200 OK status and the data
    res.status(200).json({
      success: true,
      count: badges.length,
      data: badges,
    });
  } catch (error) {
    console.error('Error fetching badges:', error);
    
    // Handle database or unexpected errors gracefully
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to retrieve badges.',
    });
  }
};


export const awardBadge = async (userId: number, badgeId: number) => {
  // Check if they already have it so you don't duplicate it
  const alreadyEarned = await UserBadge.findOne({ where: { userId, badgeId } });
  
  if (!alreadyEarned) {
    await UserBadge.create({ userId, badgeId });
    console.log(`Badge ${badgeId} successfully awarded to user ${userId}`);
  }
};


export const createBadge = async (req: Request, res: Response): Promise<void> => {
  try {
    const { badgeName, badgeImage, badgeDescription } = req.body;

    // 1. Basic Validation
    if (!badgeName || !badgeImage || !badgeDescription) {
       res.status(400).json({ 
        success: false, 
        message: 'Please provide badgeName, badgeImage, and badgeDescription.' 
      });
       return;
    }

    // 2. Optional: Check if a badge with the same name already exists
    const badgeExists = await Badge.findOne({ where: { badgeName } });
    if (badgeExists) {
       res.status(400).json({ 
        success: false, 
        message: 'A badge with this name already exists.' 
      });
       return;
    }

    // 3. Create the badge in PostgreSQL
    const newBadge = await Badge.create({
      badgeName,
      badgeImage,
      badgeDescription,
    });

    res.status(201).json({
      success: true,
      message: 'Badge created successfully.',
      data: newBadge,
    });
  } catch (error) {
    console.error('Error creating badge:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error: Unable to create badge.',
    });
  }
};