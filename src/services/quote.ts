import axios from "axios";
import { Quote } from "../types";

export async function fetchQuote(): Promise<Quote | null> {
  try {
    const { data } = await axios.get("https://zenquotes.io/api/random");
    const q = data[0];
    return { text: q.q, author: q.a };
  } catch (err: any) {
    console.error("[quote] Failed to fetch:", err.message);
    return null;
  }
}
