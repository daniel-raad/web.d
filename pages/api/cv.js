import axios from "axios"

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const apiKey = process.env.GOOGLE_API_KEY
  const fileId = "1GCafwrJ3yx5lKcNySPHfUQioyYHf1h-jkFNk9KaRYws"
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?key=${apiKey}`

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    params: { mimeType: "application/pdf" },
  })

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", "inline; filename=DanielRaadCV.pdf")
  res.send(Buffer.from(response.data))
}
