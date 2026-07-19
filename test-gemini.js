import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const key = match ? match[1] : "";
const genAI = new GoogleGenerativeAI(key);

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  try {
    const res = await model.generateContent("hello");
    console.log(res.response.text());
  } catch (e) {
    console.error(e.message);
  }
}
run();
