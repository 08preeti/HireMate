import { buildSuggestions, buildCareerTips } from "../services/aiService.js";
import { sendError } from "../utils/httpError.js";

export async function suggestions(req, res) {
  try {
    const { skills, location } = req.body;
    if (!skills || !location) return res.status(400).json({ error: "Skills and location are required" });
    res.json(await buildSuggestions(skills, location));
  } catch (err) {
    sendError(res, err, "Could not generate suggestions. Please try again.", "error");
  }
}

export function careerTips(req, res) {
  try {
    res.json({ tips: buildCareerTips(req.body.skill) });
  } catch (err) {
    sendError(res, err, "Could not load tips", "error");
  }
}
