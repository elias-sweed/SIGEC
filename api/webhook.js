export default function handler(req, res) {
  const VERIFY_TOKEN = "mi_token_secreto_123";

  // Verificación inicial de Meta (GET)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log("¡Webhook de Meta verificado en Vercel!");
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Token incorrecto');
  }

  return res.status(405).end();
}