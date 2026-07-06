import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import {
  approveParticipant,
  getPendingApprovals,
  rejectParticipant,
} from "../controllers/approveController";

const router = Router();

router.get(
  "/pending-approvals",
  authenticate,
  authorize("admin"),
  getPendingApprovals,
);
router.patch(
  "/:participantId/approve",
  authenticate,
  authorize("admin"),
  approveParticipant,
);
router.patch(
  "/:participantId/reject",
  authenticate,
  authorize("admin"),
  rejectParticipant,
);

export default router;
