import { getDashboard } from "../services/employerService.js";
import { sendError } from "../utils/httpError.js";

export async function dashboard(req, res) {
  try {
    res.json(await getDashboard(req.auth.id));
  } catch (err) {
    sendError(res, err, "Dashboard error");
  }
}
