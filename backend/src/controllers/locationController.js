import {
  getRoutePreviewToJob,
  getRouteToJob,
  getTrackedLocation,
  getTrackedRoute,
  updateLiveLocation,
} from "../services/locationService.js";
import { reversePlace, searchPlaces } from "../services/mapProviderService.js";
import {
  parseCoordinates,
  parseLocationUpdate,
  parseSearchBias,
  parseSearchQuery,
} from "../validators/locationValidators.js";
import { sendError } from "../utils/httpError.js";

export async function shareLocation(req, res) {
  try {
    const result = await updateLiveLocation(
      req.auth,
      req.params.id,
      parseLocationUpdate(req.body),
    );
    res.json({ success: true, ...result });
  } catch (err) {
    sendError(res, err, "Could not save location");
  }
}

export async function trackWorker(req, res) {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await getTrackedLocation(req.auth.id, req.params.id));
  } catch (err) {
    sendError(res, err, "Could not load location");
  }
}

export async function routeToJob(req, res) {
  try {
    res.set("Cache-Control", "no-store");
    res.json(
      await getRouteToJob(req.auth, req.params.id, parseCoordinates(req.query)),
    );
  } catch (err) {
    sendError(res, err, "Could not calculate route");
  }
}

export async function trackedRoute(req, res) {
  try {
    res.set("Cache-Control", "no-store");
    res.json(await getTrackedRoute(req.auth.id, req.params.id));
  } catch (err) {
    sendError(res, err, "Could not calculate route");
  }
}

export async function routePreview(req, res) {
  try {
    res.set("Cache-Control", "no-store");
    res.json(
      await getRoutePreviewToJob(req.params.jobId, parseCoordinates(req.query)),
    );
  } catch (err) {
    sendError(res, err, "Could not calculate route");
  }
}

export async function search(req, res) {
  try {
    res.json({
      results: await searchPlaces(
        parseSearchQuery(req.query.q),
        parseSearchBias(req.query),
      ),
    });
  } catch (err) {
    sendError(res, err, "Address search failed");
  }
}

export async function reverse(req, res) {
  try {
    const { lat, lng } = parseCoordinates(req.query);
    res.json(await reversePlace(lat, lng));
  } catch (err) {
    sendError(res, err, "Address lookup failed");
  }
}
