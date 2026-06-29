import { Router } from "express";
import { requireAuth, authorize } from "../middleware/auth.js";
import { sendForwardEmail } from "../email.js";

// Review actions that need server involvement. Mounted at /api/reviews.
// The status change itself still flows through the whole-dataset PUT; this
// endpoint only performs the side effect a client can't: emailing the admin on
// a forward. It deliberately does NOT write the dataset, so it can't race with
// (and clobber) the client's concurrent status-change PUT.
export function reviewsRouter() {
  const router = Router();

  // Officer/admin forwarded a document to the admin -> email the admin.
  // Email failure never fails the request (the forward already happened); the
  // delivery result is reported back so the UI can hint at it.
  router.post("/forward", requireAuth, authorize("officer"), async (req, res) => {
    const body = req.body || {};
    const details = {
      reviewId: String(body.reviewId || ""),
      documentName: String(body.documentName || ""),
      comment: String(body.comment || ""),
      ownerName: String(body.ownerName || ""),
      forwardedBy: req.user.name || req.user.email,
    };

    try {
      const emailed = await sendForwardEmail(details);
      res.json({ ok: true, emailed });
    } catch (error) {
      res.json({ ok: true, emailed: { sent: false, error: error.message } });
    }
  });

  return router;
}
