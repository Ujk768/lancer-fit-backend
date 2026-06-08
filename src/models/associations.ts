// src/models/associations.ts
import { User } from './User';
import { TLCChallenge } from './Challenge';
import { TLCChallengeParticipant } from './Participant';
import { PersonalChallenge } from './Challenge';

export function defineAssociations() {

  // ── M:N — User <-> TLCChallenge through the bridge ──────────────
  User.belongsToMany(TLCChallenge, {
    through: TLCChallengeParticipant,  // the bridge model
    foreignKey: 'userId',
    otherKey: 'challengeId',
    as: 'tlcChallenges',               // alias for include queries
  });

  TLCChallenge.belongsToMany(User, {
    through: TLCChallengeParticipant,
    foreignKey: 'challengeId',
    otherKey: 'userId',
    as: 'participants',
  });

  // ── Bridge associations — lets you do participant.user etc ───────
  TLCChallengeParticipant.belongsTo(User, { foreignKey: 'userId', as: 'user' });
  TLCChallengeParticipant.belongsTo(TLCChallenge, { foreignKey: 'challengeId', as: 'challenge' });

  User.hasMany(TLCChallengeParticipant, { foreignKey: 'userId', as: 'participations' });
  TLCChallenge.hasMany(TLCChallengeParticipant, { foreignKey: 'challengeId', as: 'participations' });

  // ── 1:M — User -> PersonalChallenge ─────────────────────────────
  User.hasMany(PersonalChallenge, {
    foreignKey: 'userId',
    as: 'personalChallenges',
    onDelete: 'CASCADE',
  });

  PersonalChallenge.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
  });
}