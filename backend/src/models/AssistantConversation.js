import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    action: { type: mongoose.Schema.Types.Mixed },
    meta: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false },
);

const assistantConversationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    userRole: { type: String, enum: ["worker", "employer"], required: true },
    voiceSettings: {
      enabled: { type: Boolean, default: true },
      autoSpeakGreeting: { type: Boolean, default: false },
      voiceName: { type: String, default: "" },
      speechRate: { type: Number, default: 1.0 },
      pitch: { type: Number, default: 1.0 },
    },
    preferredLanguage: { type: String, enum: ["en", "hi", "mr"], default: "en" },
    preferredName: { type: String, default: "" },
    pendingContext: { type: mongoose.Schema.Types.Mixed, default: {} },
    history: {
      type: [messageSchema],
      default: [],
    },
  },
  { timestamps: true },
);

// Keep history bounded to most recent 40 messages to prevent unbounded growth
assistantConversationSchema.methods.addMessage = function (msg) {
  this.history.push(msg);
  if (this.history.length > 40) {
    this.history = this.history.slice(-40);
  }
};

const AssistantConversation = mongoose.models.AssistantConversation ||
  mongoose.model("AssistantConversation", assistantConversationSchema);

export default AssistantConversation;
