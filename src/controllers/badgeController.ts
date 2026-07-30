import { NextFunction, Request, Response } from 'express';
import UserBadge from '../models/UserBadge';
import Badge, { BadgeType } from '../models/Badges';
import { SpecialtyBadge } from '../models/SpecialtyBadge';
import { sequelize } from '../config/database';
import { SPECIALTY_RULE_KEYS } from '../services/badges/specialtyBadges';
import { buildMetaMap, serializeBadge } from '../services/badges/badgeSerializer';

/**
 * @desc    Full badge catalog (every badge definition), each with its
 *          type-specific metadata. Use this for a "all badges / locked +
 *          unlocked" view; cross-reference badgeId against GET /badge/me to
 *          mark which the current user has earned.
 * @route   GET /api/badge/all
 * @access  Public
 */
export const getAllBadges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const badges = await Badge.findAll({ order: [['badgeID', 'ASC']] });
    const metaMap = await buildMetaMap(badges);
    const data = badges.map((b) => serializeBadge(b, metaMap.get(b.badgeID) ?? null));
    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Badges the logged-in user has earned, each with earnedAt and the
 *          same metadata shape as /badge/all. This is the endpoint a "my
 *          badges" screen reads.
 * @route   GET /api/badge/me
 * @access  Authenticated (any logged-in user)
 */
export const getMyBadges = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    // Award rows, newest first — createdAt is the earned-at timestamp.
    const awards = await UserBadge.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });
    if (awards.length === 0) {
      return res.status(200).json({ success: true, count: 0, data: [] });
    }

    const earnedAtByBadgeId = new Map<number, Date>();
    for (const a of awards) earnedAtByBadgeId.set(a.badgeID, a.get('createdAt') as Date);

    const badges = await Badge.findAll({ where: { badgeID: [...earnedAtByBadgeId.keys()] } });
    const metaMap = await buildMetaMap(badges);

    // Preserve the award ordering (newest earned first).
    const badgeById = new Map(badges.map((b) => [b.badgeID, b]));
    const data = awards
      .map((a) => {
        const badge = badgeById.get(a.badgeID);
        if (!badge) return null; // award row lingered past its badge — skip defensively
        return serializeBadge(badge, metaMap.get(badge.badgeID) ?? null, earnedAtByBadgeId.get(badge.badgeID)!);
      })
      .filter(Boolean);

    res.status(200).json({ success: true, count: data.length, data });
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
  // Two accepted ruleKey forms:
  //  - a hardcoded rule from the code registry (evaluated on activity logging), or
  //  - "exercise:<exerciseKey>" — earned by logging that catalog exercise via
  //    POST /api/exercise/log (evaluated by evaluateExerciseBadges). This form is
  //    data-driven, so no code change is needed to add one.
  // Reject anything else NOW rather than creating a badge whose rule never runs.
  const isExerciseRule = /^exercise:[a-z0-9-]+$/.test(ruleKey || '');
  if (!ruleKey || (!SPECIALTY_RULE_KEYS.includes(ruleKey) && !isExerciseRule)) {
    return res.status(400).json({
      success: false,
      message: `ruleKey must be one of: ${SPECIALTY_RULE_KEYS.join(', ')}, ` +
        `or of the form "exercise:<exerciseKey>" (e.g. "exercise:basketball"). ` +
        'Hardcoded rules are added in code first (src/services/badges/specialtyBadges.ts).',
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
