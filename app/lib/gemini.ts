import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export type JobAnalysis = {
  score: number;
  reason: string;
  proposal: string;
};

export type JobListing = {
  title: string;
  budget: string;
  summary: string;
  score: number;
  id: string;
};

export async function analyzeJobDetail(detail: string): Promise<JobAnalysis> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `Identity: Rifqi Wariyanto (Senior Full-Stack Developer).
  Skills: Next.js, Flutter, Firebase, Tailwind CSS.
  Design Style: Apple-style, Minimalism, Glassmorphism.
  Top Projects: Kasir Mantab (POS), TALITA (School Management).
  
  Context: User lacks English skills, so act as a perfect bridge.
  
  Instruction: Analyze this Upwork Job: "${detail}"
  
  Tasks:
  1. Determine if it's a GOOD FIT for Rifqi's skills (Score 0-100).
  2. Write an honest reasoning in INDONESIAN. Focus on why it's good or risky.
  3. Draft a WINNING PROPOSAL in NATURAL ENGLISH. Mention "Kasir Mantab" if relevant. Use a problem-solving tone.
  
  Output Format:
  [SCORE] value [/SCORE]
  [REASON] indonesian explanation [/REASON]
  [PROPOSAL] english text [/PROPOSAL]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const score = parseInt(text.match(/\[SCORE\](.*?)\[\/SCORE\]/s)?.[1] || "0");
  const reason = text.match(/\[REASON\](.*?)\[\/REASON\]/s)?.[1].trim() || "Gagal menganalisis.";
  const proposal = text.match(/\[PROPOSAL\](.*?)\[\/PROPOSAL\]/s)?.[1].trim() || text;

  return { score, reason, proposal };
}

export async function parseJobList(listText: string): Promise<JobListing[]> {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `Extract a list of jobs from this Upwork search text: "${listText}"
  
  For each job, provide:
  - Title
  - Budget/Price
  - Brief Summary (1 sentence)
  - Match Score (0-100) for Rifqi (Next.js, Flutter, Firebase)
  
  Format as JSON array:
  [{"title": "...", "budget": "...", "summary": "...", "score": 85, "id": "1"}]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  try {
    const jsonStr = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to parse job list JSON", e);
    return [];
  }
}
