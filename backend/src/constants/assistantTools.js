/**
 * Schema and definitions for HireMate JARVIS Assistant Tools.
 * Each tool specifies its name, category, description, required role,
 * parameters schema, and whether it requires explicit user confirmation before executing.
 */

export const ASSISTANT_TOOLS = [
  {
    name: "search_jobs",
    role: "worker",
    description: "Search for active jobs based on category, skills, location keywords, wage range, or maximum distance.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords or skills like 'painter', 'mason', 'plumber', 'wireman', 'electrician'" },
        category: { type: "string", description: "Job trade/category" },
        minWage: { type: "number", description: "Minimum daily wage in INR" },
        location: { type: "string", description: "City or locality name" },
        maxDistanceKm: { type: "number", description: "Maximum radius in km from current location" },
        latitude: { type: "number", description: "Current worker latitude if available" },
        longitude: { type: "number", description: "Current worker longitude if available" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "get_my_profile",
    role: "any",
    description: "Retrieve the authenticated user's profile details, skills, location, ratings, experience, and completion status.",
    parameters: {
      type: "object",
      properties: {},
    },
    requiresConfirmation: false,
  },
  {
    name: "update_profile",
    role: "worker",
    description: "Update the worker's profile fields such as experience, skills, location, name, or availability. Requires user confirmation with old vs new preview.",
    parameters: {
      type: "object",
      properties: {
        field: { type: "string", enum: ["experienceYears", "location", "skills", "name", "gender", "about"], description: "The specific profile field to update" },
        newValue: { type: "any", description: "The new value to set" },
        name: { type: "string", description: "Full name of the worker" },
        skills: { type: "string", description: "Comma separated skills or trade (e.g. 'Painting, Masonry')" },
        location: { type: "string", description: "Current locality/city" },
        experienceYears: { type: "number", description: "Years of experience" },
        gender: { type: "string", enum: ["male", "female", "other"], description: "Worker gender" },
      },
    },
    requiresConfirmation: true,
  },
  {
    name: "get_my_applications",
    role: "worker",
    description: "List the worker's submitted job applications, statuses (pending, accepted, offer, active, completed, etc.), and recent updates.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", description: "Optional filter: 'pending', 'accepted', 'offer', 'completed', 'active'" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "get_job_details",
    role: "any",
    description: "Get detailed information about a specific job post by its ID.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "The Job ID to fetch" },
      },
      required: ["jobId"],
    },
    requiresConfirmation: false,
  },
  {
    name: "apply_for_job",
    role: "worker",
    description: "Apply for an open job post. This creates an application. Requires explicit user confirmation before submitting.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "The ID of the job to apply for" },
        message: { type: "string", description: "Optional message or note to the employer" },
      },
      required: ["jobId"],
    },
    requiresConfirmation: true,
  },
  {
    name: "respond_to_offer",
    role: "worker",
    description: "Accept or decline an employer's direct job offer.",
    parameters: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "The application/offer ID" },
        response: { type: "string", enum: ["accept", "decline"], description: "Whether to accept or decline the offer" },
      },
      required: ["applicationId", "response"],
    },
    requiresConfirmation: true,
  },
  {
    name: "navigate_to_job",
    role: "worker",
    description: "Get navigation link, route, or gate directions to the accepted job site.",
    parameters: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "The accepted application ID" },
      },
      required: ["applicationId"],
    },
    requiresConfirmation: false,
  },
  {
    name: "get_my_jobs",
    role: "employer",
    description: "Retrieve all job postings published by the authenticated employer, including vacancy counts, applicant counts, and status.",
    parameters: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["active", "filled", "closed", "completed", "all"], description: "Job status filter" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "create_job_post",
    role: "employer",
    description: "Draft or post a new job requirement. Requires explicit user confirmation before publishing.",
    parameters: {
      type: "object",
      properties: {
        jobTitle: { type: "string", description: "Title of the job (e.g. 'Experienced Painter needed')" },
        category: { type: "string", description: "Work category/trade (e.g. 'Painting', 'Masonry', 'Plumbing')" },
        dailyWage: { type: "number", description: "Daily wage per worker in INR (e.g. 800)" },
        vacancies: { type: "number", description: "Number of workers required (default 1)" },
        location: { type: "string", description: "Site address, landmark or area (e.g. 'Govind Nagar, Nashik')" },
        shift: { type: "string", description: "Work shift, e.g. 'Standard Day Shift (9 AM - 6 PM)'" },
        workDate: { type: "string", description: "Expected date of work" },
        description: { type: "string", description: "Detailed description of work to be done" },
        gateInstructions: { type: "string", description: "Landmark note or gate entry instructions" },
      },
      required: ["jobTitle", "dailyWage", "location"],
    },
    requiresConfirmation: true,
  },
  {
    name: "get_job_applicants",
    role: "employer",
    description: "List candidates who have applied for a specific job post or all active jobs.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Optional Job ID to filter applicants for" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "compare_candidates",
    role: "employer",
    description: "Analyze and compare two or more candidate applicants based on verified skills, experience, location proximity, and ratings, offering an objective recommendation.",
    parameters: {
      type: "object",
      properties: {
        jobId: { type: "string", description: "Optional Job ID" },
        workerNames: { type: "array", items: { type: "string" }, description: "Names of candidates to compare" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "decide_application",
    role: "employer",
    description: "Accept (hire) or decline an applicant for a job. Requires explicit user confirmation.",
    parameters: {
      type: "object",
      properties: {
        applicationId: { type: "string", description: "The ID of the application" },
        decision: { type: "string", enum: ["accepted", "declined"], description: "Whether to accept or decline the candidate" },
      },
      required: ["applicationId", "decision"],
    },
    requiresConfirmation: true,
  },
  {
    name: "get_weather_and_air_quality",
    role: "any",
    description: "Get real-time live weather conditions, rain forecast, air quality index (AQI), and outdoor work safety advice.",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "Latitude coordinate" },
        longitude: { type: "number", description: "Longitude coordinate" },
        cityName: { type: "string", description: "City or locality name" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "get_daily_briefing",
    role: "any",
    description: "Fetch a comprehensive daily briefing including role-specific stats, pending actions, weather impact on work, and recommended steps.",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "Latitude coordinate" },
        longitude: { type: "number", description: "Longitude coordinate" },
      },
    },
    requiresConfirmation: false,
  },
  {
    name: "get_platform_help",
    role: "any",
    description: "Answer questions about how HireMate works, safety guidelines, wage standards, contact support, and navigation tips.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The topic or feature the user is asking about" },
      },
    },
    requiresConfirmation: false,
  },
];
