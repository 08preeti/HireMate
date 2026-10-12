import { registerEmployer, loginEmployer } from "../services/employerAuthService.js";
import { validateEmployerRegister, validateEmployerLogin } from "../validators/authValidators.js";
import { sendError } from "../utils/httpError.js";

export async function register(req, res) {
  try {
    validateEmployerRegister(req.body);
    const session = await registerEmployer(req.body);
    res.json({ success: true, message: "Registered successfully", ...session });
  } catch (err) {
    sendError(res, err, "Server error during registration", "error");
  }
}

export async function login(req, res) {
  try {
    validateEmployerLogin(req.body);
    res.json(await loginEmployer(req.body));
  } catch (err) {
    sendError(res, err, "Server error during login", "error");
  }
}
