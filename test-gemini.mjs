import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
const match = env.match(/NEXT_PUBLIC_GEMINI_API_KEY=(.*)/);
const key = match ? match[1] : "";
const genAI = new GoogleGenerativeAI(key);

async function run() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log(data.models.map(m => m.name).join("\n"));
  } catch (e) {
    console.error(e.message);
  }
}
run();
