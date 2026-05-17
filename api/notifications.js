export default async function handler(request, response) {
  if (request.method !== "POST" && request.method !== "GET") {
    response.setHeader("Allow", "GET, POST");
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  response.status(200).json({
    ok: true,
    message: "Notification endpoint active",
    receivedAt: new Date().toISOString(),
  });
}
