import test from "node:test";
import assert from "node:assert/strict";

process.env.MONGODB_URI ||= "mongodb://localhost/unused";
process.env.JWT_SECRET ||= "test-secret";

const { analyzeJobSafety } = await import("../src/services/safetyService.js");
const { getWeatherAndAirQuality } = await import("../src/services/weatherService.js");
const { generatePersonalizedGreeting } = await import("../src/services/greetingService.js");
const { processWithIntelligentAgent } = await import("../src/services/llmProvider.js");

test("safety service flags advance payment and scam keywords", () => {
  const result = analyzeJobSafety({
    jobTitle: "Easy work, deposit money required",
    description: "Please pay registration fee to get job",
    dailyWage: 1200,
  });
  assert.equal(result.isSafe, false);
  assert.ok(result.issues.length >= 2);
  assert.match(result.advice, /deposit money|registration fee/i);
});

test("safety service flags unrealistic daily wages", () => {
  const highWage = analyzeJobSafety({
    jobTitle: "Painter",
    dailyWage: 50000,
  });
  assert.equal(highWage.isSafe, false);
  assert.match(highWage.advice, /unrealistic/i);

  const normalWage = analyzeJobSafety({
    jobTitle: "Painter required",
    description: "Interior wall painting for 2 BHK",
    dailyWage: 850,
  });
  assert.equal(normalWage.isSafe, true);
  assert.equal(normalWage.issues.length, 0);
});

test("weather service provides weather data and work safety recommendations", async () => {
  const data = await getWeatherAndAirQuality({ latitude: 19.9975, longitude: 73.7898, cityName: "Nashik" });
  assert.ok(data);
  assert.equal(data.city, "Nashik");
  assert.equal(typeof data.temperature, "number");
  assert.equal(typeof data.safetyAdvice, "string");
  assert.equal(typeof data.isOutdoorSafe, "boolean");
});

test("greeting service generates time-of-day greetings in English, Hindi, and Marathi", async () => {
  const workerAuth = { id: "507f1f77bcf86cd799439011", role: "worker" };
  const userDoc = { name: "Ramesh Pawar", preferredLanguage: "mr" };

  const greetingMr = await generatePersonalizedGreeting(workerAuth, userDoc, { timezoneOffset: -330 }); // IST
  assert.equal(greetingMr.language, "mr");
  assert.match(greetingMr.spokenGreeting, /Ramesh Pawar/);

  const greetingHi = await generatePersonalizedGreeting(workerAuth, { name: "Ramesh", preferredLanguage: "hi" }, { timezoneOffset: -330 });
  assert.equal(greetingHi.language, "hi");
  assert.match(greetingHi.spokenGreeting, /Ramesh/);
});

test("intelligent agent accurately parses conversational intents and trade keywords", async () => {
  const auth = { id: "507f1f77bcf86cd799439011", role: "worker" };
  const userDoc = { name: "Suresh" };

  // Weather query
  const weatherRes = await processWithIntelligentAgent({
    message: "What is the weather and rain status today?",
    auth,
    userDoc,
  });
  assert.equal(weatherRes.executedTool, "get_weather_and_air_quality");

  // Help / FAQ query
  const helpRes = await processWithIntelligentAgent({
    message: "How does payment work on HireMate?",
    auth,
    userDoc,
  });
  assert.equal(helpRes.executedTool, "get_platform_help");
  assert.match(helpRes.reply, /payment/i);

  // Conversational response
  const greetRes = await processWithIntelligentAgent({
    message: "Who are you?",
    auth,
    userDoc,
  });
  assert.match(greetRes.reply, /JARVIS/i);
});
