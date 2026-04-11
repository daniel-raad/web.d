import axios from "axios"

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end()

  const apiKey = process.env.GOOGLE_API_KEY
  const fileId = "1sIiM0gdn1o7TfZ4jET_K_G9czm4yqlqmLtSFztDzSXk"
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?key=${apiKey}`

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    params: { mimeType: "application/pdf" },
  })

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", "inline; filename=DanielRaadCV.pdf")
  res.send(Buffer.from(response.data))
}
