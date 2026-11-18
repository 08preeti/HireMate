import { translateText } from "../services/translateService.js";
import { sendError } from "../utils/httpError.js";

export async function translate(req, res) {
  try {
    const { text, to } = req.body ?? {};
    res.json(await translateText(text, to));
  } catch (err) {
    sendError(res, err, "Could not translate this text", "message");
  }
}