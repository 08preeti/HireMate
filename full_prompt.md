<USER_REQUEST>
# PROJECT: HIREMATE JARVIS – Advanced AI Personal Assistant
## 1. Main Objective
we have already implemented a basic AI assistant named **HIREMATE JARVIS** inside my existing HireMate application.

However, the current implementation looks and behaves like a traditional chatbot with a large conversation panel. I DO NOT want this experience.

I want to completely transform JARVIS into an advanced, intelligent, voice-first personal AI assistant inspired by:

- JARVIS from Iron Man – intelligent, proactive, loyal, capable of executing tasks, giving opinions, and managing operations.
- Siri – natural voice conversations, contextual responses, and hands-free interactions.
- Gemini – friendly, intelligent, conversational, and capable of understanding natural language.
- A personal human assistant – someone who understands the user's needs, remembers context, provides suggestions, and takes action on the user's behalf.

JARVIS must become an integral part of HireMate, not a separate chatbot application.

**Its purpose is to help both Workers and Employers operate HireMate without needing to understand or navigate complicated interfaces.**

The assistant should understand natural Hindi, English, and Marathi, including mixed-language conversations (Hinglish).

---

## 2. Completely Redesign the Assistant UI

Remove the existing large chatbot-style floating panel as the primary interface.

Create a beautiful, minimal, futuristic, animated AI assistant interface.

### Floating AI Orb

- JARVIS should appear as a small, circular, animated AI orb.
- It must remain fixed at the top-right area of the application.
- It should remain accessible across all HireMate pages, dashboards, profiles, job listings, applications, and settings.
- It should not block the main page content.
- It should have a premium futuristic appearance with subtle glowing effects, gradients, and smooth animations.
- Clicking the orb should activate the assistant.
- The orb should visually communicate its current state.

### Orb Animation States

Implement different animations for:

1. Idle – subtle breathing/glowing animation.
2. Greeting – orb becomes active when greeting the user.
3. Listening – animated sound waves or pulsing rings.
4. Thinking – rotating or processing animation.
5. Speaking – dynamic waveform or audio-reactive animation.
6. Executing – progress animation while performing a task.
7. Confirmation – visual indication that user approval is required.
8. Success – subtle success animation after completing an action.
9. Error – clear visual indication when an operation fails.

### Conversation Interface

When the user clicks the orb or starts interacting:

- Open a compact, modern assistant interface.
- Show conversation history in a clean and readable format.
- Provide a microphone button.
- Provide text input as an alternative.
- Show voice recognition status.
- Display live transcription.
- Provide a mute/unmute option.
- Provide a close/minimize option.
- Allow users to interrupt JARVIS while it is speaking.

The interface should feel like communicating with an intelligent personal assistant, NOT using a traditional customer-support chatbot.

---

## 3. Proactive Personal Greeting System

JARVIS should not wait for the user to type the first message.

When a user logs into HireMate, JARVIS should initiate a friendly greeting.

First identify:

- The authenticated user.
- Whether the user is a Worker or Employer.
- The user's preferred language.
- The current local time.
- Relevant available account context.

### Greeting Examples

Morning:

"Good morning, Raghav! Hope you're having a wonderful morning. Aaj ka din kaise start ho raha hai? Would you like me to check some new opportunities for you?"

Afternoon:

"Good afternoon, Raghav! How's your day going? I've got your HireMate activities ready. Shall we check what's new?"

Evening:

"Good evening, Raghav! Hope everything is going well. Would you like me to give you a quick update about your applications?"

Night:

"Hey Raghav! Working late tonight? I'm here if you need anything."

Greetings must be personalized according to the user's name, role, language, local time, and available context.

IMPORTANT:

- Do not repeat the same greeting every time.
- Avoid disturbing users repeatedly.
- Respect mute, quiet hours, and notification preferences.
- Ask for microphone permission before accessing the microphone.
- Handle browser autoplay restrictions gracefully.
- If automatic audio playback is unavailable, display a friendly greeting and let the user activate voice interaction.

---

## 4. Natural Human-Like Voice Conversations

This is one of the MOST IMPORTANT requirements.

JARVIS must communicate naturally, like Siri or a real personal assistant.

It should:

- Understand complete sentences.
- Understand incomplete sentences and informal language.
- Understand Hindi, English, Marathi, and Hinglish.
- Maintain conversational context.
- Ask relevant follow-up questions.
- Remember what the user said earlier in the current conversation.
- Avoid robotic and repetitive responses.
- Speak in a friendly, professional, and respectful manner.
- Share useful suggestions and opinions when appropriate.
- Use light humor and friendly conversation when appropriate.

Example:

User: "Jarvis, kuch nayi jobs aayi hain kya?"

JARVIS: "Bilkul! Main abhi aapki skills check karti hoon. Aapko electrician aur wireman ki jobs bhi dikha sakti hoon. Ek minute!"

User: "Mere liye best wali dekhna."

JARVIS: "Sure! Main distance, salary aur aapki skills ke basis par best opportunities shortlist karungi."

The assistant must feel like a continuous conversation, not a sequence of unrelated question-and-answer messages.

---

## 5. Two Different Personal Assistant Experiences

JARVIS must understand the user's role and provide different capabilities to Workers and Employers.

### A. WORKER PERSONAL ASSISTANT

JARVIS should help workers with almost everything related to finding and managing work.

#### Job Discovery

Example:

Worker: "Jarvis, mujhe wireman ka kaam aata hai. Koi job available hai kya?"

JARVIS should:

1. Identify the worker's skills from their profile.
2. Search actual job postings in the HireMate database.
3. Find matching opportunities.
4. Consider distance, salary, experience, and availability.
5. Present the most relevant results.
6. Explain the available jobs in simple language.
7. Ask whether the worker wants to apply.

Example response:

"Raghav, mujhe aapke liye 3 wireman jobs mili hain. Ek job sirf 4 kilometres door hai aur uski salary ₹800 per day hai. Kya main aapko is job ke liye apply kar doon?"

#### Application Tracking

Worker should be able to ask:

- "Meri application accept hui kya?"
- "Kisi employer ne mujhe select kiya hai?"
- "Meri application ka kya status hai?"
- "Maine kitni jobs ke liye apply kiya hai?"
- "Koi naya response aaya hai kya?"

JARVIS must retrieve the actual application status from HireMate.

#### Automatic Profile Management

Workers should be able to update their profile through natural conversation.

Example:

Worker: "Jarvis, mujhe meri profile update karni hai."

JARVIS: "Bilkul! Kya update karna chahenge?"

Worker: "Mera experience 3 saal kar do."

JARVIS:

1. Identify the experience field.
2. Prepare the updated value.
3. Display the old and new values.
4. Ask for confirmation.

"Your experience is currently 2 years. Should I update it to 3 years?"

Worker: "Haan."

JARVIS:

- Update the appropriate profile field through the existing backend.
- Verify that the update succeeded.
- Confirm the result.

"Done! Aapka experience successfully 3 years update ho gaya hai."

Support updates to:

- Full name.
- Phone number.
- Address.
- Location.
- Skills.
- Experience.
- Education.
- Profile description.
- Availability.
- Other existing editable profile fields.

Never invent fields that do not exist in the actual HireMate profile.

#### Other Worker Operations

JARVIS should also support:

- Searching for nearby jobs.
- Applying for jobs.
- Viewing saved jobs.
- Checking accepted applications.
- Checking active work.
- Checking completed work.
- Updating availability.
- Managing profile information.
- Checking notifications.
- Understanding job details.
- Getting suggestions for improving their profile.

### B. EMPLOYER PERSONAL ASSISTANT

JARVIS should act as an intelligent recruitment and workforce management assistant for employers.

#### Job Management

Employer can say:

- "Jarvis, mujhe painter chahiye."
- "Mere liye ek electrician job post karo."
- "Meri existing jobs dikhao."
- "Kaunsi jobs active hain?"
- "Kisi job ki applications aayi hain kya?"
- "Meri job edit kar do."
- "Is job ko close kar do."

Example:

Employer: "Jarvis, mujhe 2 painters chahiye Nashik mein."

JARVIS should:

1. Understand the job requirement.
2. Identify required fields.
3. Ask for missing details.
4. Prepare a job posting.
5. Show a complete preview.
6. Request approval.
7. Create the job through the existing HireMate backend.
8. Verify successful creation.

#### Application Management

Employer can ask:

- "Kitni applications aayi hain?"
- "Koi naya worker apply kiya hai?"
- "Mujhe painter applicants dikhao."
- "Kis worker ka experience zyada hai?"
- "Meri job par kitne candidates hain?"
- "Kisi worker ko accept kiya hai kya?"

JARVIS should fetch real application and candidate information from the database.

#### Candidate Recommendations

JARVIS should analyze available candidate information and suggest suitable workers based on:

- Skills.
- Experience.
- Location.
- Availability.
- Previous work history.
- Employer requirements.

It should explain why a candidate is recommended.

#### Worker Acceptance and Rejection

Employer can say:

"Jarvis, Raghav ko meri job ke liye accept kar do."

JARVIS should:

1. Identify the correct candidate and job.
2. Check the current application status.
3. Confirm the intended action.
4. Show the candidate and job details.
5. Ask for explicit approval.
6. Update the application status after approval.
7. Verify the backend response.
8. Notify the employer and worker through existing notification mechanisms.

The same approval system must apply to rejection, job cancellation, and other consequential actions.

---

## 6. Intelligent Task Execution System

JARVIS must not simply explain how to use HireMate.

It should actually perform supported actions on behalf of the user.

Examples:

- Update profile information.
- Search for jobs.
- Apply for jobs.
- Create job postings.
- Edit job postings.
- Manage applications.
- Accept or reject candidates.
- Check application statuses.
- Retrieve notifications.
- Manage supported account settings.

### Critical Approval Workflow

EVERY important modification must follow this workflow:

User's voice/text command
→ Intent detection
→ Identify required action
→ Retrieve necessary data
→ Prepare changes
→ Validate information
→ Show action preview
→ Ask user for approval
→ Execute backend operation
→ Verify result
→ Inform user.

Example:

User: "Jarvis, meri location Pune kar do."

JARVIS: "Your current location is Nashik. I can change it to Pune. Should I update your profile?"

User: "Yes."

JARVIS: Executes the update.

JARVIS: "Successfully! Your location is now Pune."

IMPORTANT RULES:

- Never modify user data without explicit confirmation.
- Never apply for jobs without approval.
- Never publish or delete jobs without approval.
- Never accept or reject candidates without approval.
- Never send consequential messages without approval.
- Never claim an operation succeeded unless the backend confirms it.
- If information is missing, ask the user instead of guessing.
- For sensitive or irreversible operations, require stronger confirmation.

For simple informational requests, do not ask unnecessary approval.

---

## 7. Real-Time Monitoring and Proactive Notifications

JARVIS should continuously help users stay informed about important HireMate activities.

### Worker Notifications

If:

- A new matching job is posted.
- An employer accepts an application.
- An employer rejects an application.
- An employer sends an offer.
- An application status changes.
- Important account activity occurs.

JARVIS should inform the worker.

Example:

"Raghav, good news! The employer has accepted your application for the Wireman position. Would you like me to show you the details?"

### Employer Notifications

If:

- A new worker applies.
- A suitable candidate becomes available.
- An application receives an update.
- A worker accepts an offer.
- A job receives new applications.
- An important recruitment event occurs.

JARVIS should inform the employer.

Example:

"Good news! A new painter has applied for your Nashik job. Would you like me to review their profile?"

### Technical Requirements

- Integrate with existing notification APIs.
- Use WebSockets, Server-Sent Events, or the existing real-time infrastructure where appropriate.
- Use event-driven notifications instead of continuously polling the database unnecessarily.
- Avoid duplicate notifications.
- Support notification preferences.
- Support background notifications where browser permissions allow them.
- Never invent updates or claim that a change happened without receiving a verified event or API response.

---

## 8. Weather, Environment and Daily Intelligence

JARVIS should also behave like an intelligent daily personal assistant.

It should be able to provide:

- Current weather.
- Temperature.
- Rain predictions.
- Weather warnings.
- Air quality information where available.
- Local environmental conditions.
- Relevant daily information.

Example:

"Good morning, Raghav! Aaj Nashik mein weather kaafi pleasant hai. Temperature 26°C hai. Agar aap outdoor work ke liye ja rahe hain, toh aaj ka din achha ho sakta hai."

Weather and environmental information must come from reliable external APIs.

Use the user's location only with appropriate permission.

Do not invent current weather, AQI, or environmental information.

---

## 9. Personality, Opinions and Intelligence

JARVIS should have a consistent personality.

It should be:

- Friendly.
- Intelligent.
- Helpful.
- Respectful.
- Proactive.
- Confident but not arrogant.
- Slightly humorous when appropriate.
- Professional during important operations.
- Empathetic when users face problems.

It should be capable of giving useful opinions.

Example:

Employer: "Jarvis, in dono workers mein se kaun better hai?"

JARVIS: "Mere analysis ke according, Raghav aapki requirement ke liye better match hain. Unke paas 3 years ka relevant experience hai aur woh aapke location ke bhi closer hain. However, final selection aapka decision hoga."

JARVIS must explain its recommendations using actual available data.

It must not make discriminatory recommendations based on protected characteristics or unsupported assumptions.

---

## 10. Accessibility – Designed for Less-Literate Users

This is a VERY IMPORTANT requirement.

HireMate is also designed for workers who may not be comfortable reading or writing.

Therefore, JARVIS should make the application usable through voice.

Requirements:

- Voice-first interaction.
- Simple Hindi, Marathi, and English responses.
- Easy-to-understand explanations.
- Minimal technical terminology.
- Clear spoken instructions.
- Large and accessible microphone control.
- Voice-guided confirmation.
- Spoken job details.
- Spoken application status.
- Support for users who cannot type.
- Allow users to repeat or clarify instructions.
- Provide visual confirmation alongside voice responses.

Example:

Worker: "Mujhe kaam chahiye."

JARVIS: "Bilkul! Aapko kis tarah ka kaam aata hai? Jaise painter, electrician, plumber ya carpenter?"

The assistant should guide users step by step without making them navigate complex forms.

---

## 11. Technical Architecture and Existing Project Integration

IMPORTANT: Do not create a completely separate HireMate application or an unrelated standalone assistant.

JARVIS must be integrated into the existing HireMate project.

Before implementation:

1. Analyze the complete existing project structure.
2. Understand the frontend framework and existing component architecture.
3. Understand backend APIs and authentication.
4. Inspect database models and relationships.
5. Identify existing Worker and Employer roles.
6. Inspect existing job, application, profile, notification, and dashboard functionality.
7. Review the currently implemented JARVIS code.
8. Identify reusable services and components.
9. Understand the existing AI provider and voice integration.

Preserve existing HireMate functionality.

Do not unnecessarily rewrite working modules.

### Suggested Architecture

Create modular services for:

- JARVIS conversation management.
- Voice input and speech recognition.
- Text-to-speech.
- Language detection.
- Intent recognition.
- Context and conversation memory.
- Worker assistant operations.
- Employer assistant operations.
- Job discovery.
- Application management.
- Profile management.
- Job posting management.
- Notification monitoring.
- Weather and environmental information.
- Approval and task execution.
- Error handling and operation verification.

Use the existing project conventions wherever possible.

### AI and Backend Requirements

- Use the existing AI provider if it is already integrated and suitable.
- If additional AI capabilities are required, integrate them through secure backend services.
- Never expose API keys or secrets in frontend code.
- Use structured tool/function calling for HireMate operations.
- Connect tools to actual authenticated backend APIs.
- Enforce role-based authorization on the server.
- Validate every requested operation.
- Maintain conversation context.
- Keep the assistant aware of the current page and relevant application context.
- Do not allow the AI model to directly modify the database.
- Use controlled backend services for all mutations.
- Add logging and error handling for assistant actions.

### Suggested Execution Flow

AI understands the user command.

AI selects an appropriate permitted tool.

Backend validates:

- User authentication.
- User role.
- Permissions.
- Requested resource ownership.
- Input validity.

Backend prepares the operation.

JARVIS asks for approval when required.

After approval, backend executes the operation.

Backend returns the actual result.

JARVIS communicates the result naturally.

---

## 12. Conversation Memory and Context Awareness

JARVIS should remember relevant conversational context.

Example:

User: "Mujhe electrician ki jobs dikhao."

JARVIS: "Mujhe 4 jobs mili hain."

User: "Sabse paas wali dikhao."

JARVIS should understand that "sabse paas wali" refers to the previously retrieved electrician jobs.

Similarly:

User: "Meri profile update karni hai."

JARVIS: "Kya change karna hai?"

User: "Experience 3 saal."

JARVIS should understand that the user wants to update the experience field, not create a new unrelated task.

Maintain:

- Current conversation context.
- Current task state.
- Pending confirmation.
- Relevant previous results.
- User role and language preferences.
- Useful long-term preferences where appropriate.

Never expose private information across different users or accounts.

---

## 13. Error Handling and Trust

JARVIS should behave intelligently when something goes wrong.

Examples:

If no jobs are found:

"I couldn't find any matching wireman jobs right now. Would you like me to search in nearby areas?"

If an update fails:

"I tried updating your profile, but the server couldn't complete the request. Your existing information has not been changed."

If a command is unclear:

"I didn't quite understand that. Do you want to update your profile or search for a new job?"

If the user cancels:

"No problem! I haven't made any changes."

JARVIS must never fabricate information or pretend that it has completed an operation.

---

## 14. Performance and User Experience

- The assistant must not slow down HireMate.
- Load the assistant efficiently.
- Avoid unnecessary database requests.
- Use asynchronous operations.
- Provide task progress feedback.
- Handle network failures gracefully.
- Support mobile, tablet, and desktop.
- Ensure the floating orb does not overlap important UI elements.
- Make animations smooth and lightweight.
- Preserve accessibility and keyboard support.

---

## 15. Implementation and Testing Requirements

Implement the complete feature, not just a frontend demonstration.

Test the following scenarios:

### Worker Tests

1. Worker logs in and receives a personalized greeting.
2. Worker asks for available wireman jobs.
3. JARVIS searches actual HireMate job listings.
4. Worker asks for application status.
5. JARVIS retrieves the correct application.
6. Worker requests a profile update.
7. JARVIS previews the change and requests approval.
8. Worker approves and the backend updates the profile.
9. Worker receives a notification when an employer accepts an application.

### Employer Tests

1. Employer logs in and receives a personalized greeting.
2. Employer asks for new applications.
3. JARVIS retrieves real candidate data.
4. Employer requests a new job posting.
5. JARVIS collects missing details.
6. JARVIS generates a preview.
7. Employer approves and the job is published.
8. Employer asks to accept a worker.
9. JARVIS asks for confirmation.
10. The application status updates successfully.
11. The worker receives the appropriate notification.

### Voice Tests

- Hindi voice input.
- English voice input.
- Marathi voice input.
- Hinglish voice input.
- Speech recognition failures.
- Interrupting assistant speech.
- Microphone permissions.
- Text fallback.
- Different browsers and devices.

---

## 16. Final Expected Result

The final JARVIS experience should feel like having a real personal AI assistant inside HireMate.

A worker should be able to say:

"Jarvis, mujhe wireman ka kaam chahiye."

And JARVIS should search actual jobs, explain suitable opportunities, and help the worker apply.

An employer should be able to say:

"Jarvis, mujhe kal ke liye 2 painters chahiye."

And JARVIS should collect the necessary information, prepare the job posting, request approval, and publish it.

A user should be able to say:

"Jarvis, meri profile update kar do."

And JARVIS should understand the requested changes, fill in the appropriate fields, show a preview, obtain approval, and update the actual profile.

JARVIS should also proactively communicate important updates, provide daily assistance, share useful suggestions, and maintain friendly conversations.

**THE FINAL VISION:**

I don't want users to feel that they are talking to a chatbot.

I want them to feel that they have their own intelligent personal assistant who understands them, talks to them, remembers relevant context, advises them, monitors their HireMate activities, and handles their work with their permission.

Build JARVIS as a complete, production-ready, voice-first AI assistant deeply integrated into the existing HireMate ecosystem.

**MOST IMPORTANT: First inspect the existing project and current JARVIS implementation. Then implement the new experience using the actual project architecture, existing APIs, database models, and authentication system. Do not create mock functionality, fake data, placeholder actions, or a disconnected demo. Do not break existing HireMate features.**

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-11-21T14:23:52+05:30.
</ADDITIONAL_METADATA>