import { env } from "../config/env.js";
import { completionRate } from "./checkinStats.js";

export async function generateSummary(record) {
  const prompt = buildPrompt(record);
  const provider = resolveProvider();

  if (!provider) {
    return generateLocalSummary(record);
  }

  try {
    if (provider === "openai") return await callOpenAI(prompt);
    if (provider === "gemini") return await callGemini(prompt);
    if (provider === "deepseek") return await callDeepSeek(prompt);
    if (provider === "claude") return await callClaude(prompt);
  } catch (error) {
    console.warn(`AI provider failed, fallback to local rules: ${error.message}`);
  }

  return generateLocalSummary(record);
}

function resolveProvider() {
  const provider = env.aiProvider;
  if (provider === "openai" && env.openaiApiKey) return "openai";
  if (provider === "gemini" && env.geminiApiKey) return "gemini";
  if (provider === "deepseek" && env.deepseekApiKey) return "deepseek";
  if (provider === "claude" && env.claudeApiKey) return "claude";

  if (env.openaiApiKey) return "openai";
  if (env.deepseekApiKey) return "deepseek";
  if (env.geminiApiKey) return "gemini";
  if (env.claudeApiKey) return "claude";

  return null;
}

function buildPrompt(record) {
  const doneTasks = Object.entries(record.tasks)
    .filter(([, done]) => done)
    .map(([task]) => task)
    .join("、") || "暂无";

  return [
    "你是一个温和简洁的每日打卡助手。",
    "请根据当天学习和健康打卡内容，生成一句 30 个中文字符以内的总结。",
    "只输出总结，不要解释。",
    `完成任务：${doneTasks}`,
    `学习：${record.tasks.learning ? "已完成" : "未完成"}`,
    `学习内容：${record.aiTopic || "未填写"}`,
    `学习时长：${record.aiMinutes || 0} 分钟`,
    `今日收获：${record.dailyGain || "未填写"}`,
  ].join("\n");
}

function normalizeSummary(text) {
  return String(text || "")
    .replace(/\s+/g, "")
    .slice(0, 30) || "今天已记录，明天继续。";
}

export function generateLocalSummary(record) {
  const rate = completionRate(record);
  if (rate === 100) return "今天全完成，状态很稳。";
  if (!record.tasks.learning) return "今天未学习，明天优先完成。";
  if (!record.tasks["早睡"]) return "今天注意早睡，恢复更重要。";
  if (rate >= 75) return "今天完成不错，继续保持。";
  if (rate >= 40) return "今天有进展，明天再提高。";
  return "今天先记录，明天轻装开始。";
}

async function callOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 60,
    }),
  });
  const data = await parseAiResponse(response);
  return normalizeSummary(data.choices?.[0]?.message?.content);
}

async function callDeepSeek(prompt) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 60,
    }),
  });
  const data = await parseAiResponse(response);
  return normalizeSummary(data.choices?.[0]?.message?.content);
}

async function callGemini(prompt) {
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.geminiApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 60 },
      }),
    },
  );
  const data = await parseAiResponse(response);
  return normalizeSummary(data.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callClaude(prompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": env.claudeApiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-3-haiku-20240307",
      max_tokens: 60,
      temperature: 0.4,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await parseAiResponse(response);
  return normalizeSummary(data.content?.[0]?.text);
}

async function parseAiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `AI request failed: ${response.status}`);
  }
  return data;
}
