import { NextFunction, Request, Response } from 'express';
import UserBadge from '../models/UserBadge';
import Badge, { BadgeType } from '../models/Badges';
import { SpecialtyBadge } from '../models/SpecialtyBadge';
import { sequelize } from '../config/database';
import { SPECIALTY_RULE_KEYS } from '../services/badges/specialtyBadges';

/**
 * @desc    Get all badges
 * @route   GET /api/badge/all
 * @access  Public
 */
export const getAllBadges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const badges = await Badge.findAll();
    res.status(200).json({
      success: true,
      count: badges.length,
      data: badges,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a Specialty badge.
 *          Every other badge type is created by its own flow — Activity badges
 *          via POST /api/activity/create, Challenge Position badges via
 *          POST /api/challenge/add, Quest badges via the one-time seed. A badge
 *          of those types created here would have no evaluator wired to it and
 *          could never be earned, so this endpoint only accepts "specialty".
 * @route   POST /api/badge/add
 * @access  Admin
 */
export const createBadge = async (req: Request, res: Response, next: NextFunction) => {
  const { badgeName, badgeImage, badgeDescription, awardXpValue, secret, badgeType, ruleKey } = req.body;

  if (!badgeName || !badgeDescription) {
    return res.status(400).json({
      success: false,
      message: 'Please provide badgeName and badgeDescription.',
    });
  }
  if (typeof awardXpValue !== 'number' || awardXpValue < 0) {
    return res.status(400).json({ success: false, message: 'awardXpValue must be a non-negative number.' });
  }
  if (badgeType !== BadgeType.SPECIALTY) {
    return res.status(400).json({
      success: false,
      message:
        'Only badgeType "specialty" can be created here. Activity badges are created with the activity ' +
        '(POST /api/activity/create), challenge badges with the challenge (POST /api/challenge/add).',
    });
  }
  // Reject unregistered rule keys NOW rather than creating a badge whose rule
  // never runs — a silent no-op forever is much worse than an immediate 400.
  if (!ruleKey || !SPECIALTY_RULE_KEYS.includes(ruleKey)) {
    return res.status(400).json({
      success: false,
      message: `ruleKey must be one of: ${SPECIALTY_RULE_KEYS.join(', ')}. ` +
        'New rules are added in code first (src/services/badges/specialtyBadges.ts).',
    });
  }

  const t = await sequelize.transaction();
  try {
    const badgeExists = await Badge.findOne({ where: { badgeName }, transaction: t });
    if (badgeExists) {
      await t.rollback();
      return res.status(400).json({ success: false, message: 'A badge with this name already exists.' });
    }

    const newBadge = await Badge.create(
      {
        badgeName,
        badgeImage: badgeImage ?? null,
        badgeDescription,
        awardXpValue,
        secret: secret ?? false,
        badgeType: BadgeType.SPECIALTY,
      },
      { transaction: t },
    );
    await SpecialtyBadge.create({ badgeId: newBadge.badgeID, ruleKey }, { transaction: t });

    await t.commit();
    res.status(201).json({ success: true, message: 'Badge created successfully.', data: newBadge });
  } catch (error) {
    await t.rollback();
    next(error);
  }
};

/**
 * @desc    Delete a badge, with a backend-enforced two-step confirm when the
 *          badge has already been awarded: the first call returns 409 with the
 *          award count; retrying with ?confirm=true proceeds. XP users already
 *          received is NOT clawed back — surface that in the confirm dialog.
 * @route   DELETE /api/badge/:badgeId  (optionally ?confirm=true)
 * @access  Admin
 */
export const deleteBadge = async (req: Request, res: Response, next: NextFunction) => {
  const badgeId = Number(req.params.badgeId);
  const confirm = req.query.confirm === 'true';

  if (!Number.isInteger(badgeId)) {
    return res.status(400).json({ success: false, message: 'badgeId must be a number' });
  }

  try {
    const awardedCount = await UserBadge.count({ where: { badgeID: badgeId } });

    if (awardedCount > 0 && !confirm) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        awardedCount,
        message:
          `This badge has already been awarded to ${awardedCount} user(s). Deleting it removes it from ` +
          `their earned badges (XP they already received is not clawed back). ` +
          `Call again with ?confirm=true to proceed anyway.`,
      });
    }

    // Cascades at the DB level to the badge's sub-type row and to user_badges.
    const deleted = await Badge.destroy({ where: { badgeID: badgeId } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Badge not found' });
    }

    res.status(200).json({ success: true, awardedCountRemoved: awardedCount });
  } catch (err) {
    next(err);
  }
};
