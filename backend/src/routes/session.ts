import { Router } from "express";
import { authenticate } from "../middleware/authenticate.js";

export const sessionRouter = Router();

sessionRouter.get("/", authenticate, (req, res) => {
  res.json({ user: req.authUser });
});

