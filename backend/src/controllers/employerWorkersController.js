import { listWorkers } from "../services/employerService.js";
import { sendError } from "../utils/httpError.js";

export async function workers(req, res) {
  try {
    res.json(await listWorkers());
  } catch (err) {
    sendError(res, err, "Failed to load workers");
  }
}