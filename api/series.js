import { getData } from "../src/lib/getData.js";

export default async function handler(req, res) {
  try {
    const data = await getData();
    res.setHeader("Cache-Control", "no-store, no-cache, max-age=0, must-revalidate");
    res.setHeader("Vary", "Origin");
    res.status(200).json({ series: data.series ?? [] });
  } catch (e) {
    res.status(500).json({ error: "SERVER_ERROR", detail: String(e) });
  }
}
