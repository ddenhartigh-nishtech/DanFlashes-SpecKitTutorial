/**
 * A deterministic stand-in for Ollama (012 R11, constitution v5.1.0): the e2e store's PSSB talks to
 * this instead of a real model, so his journeys are repeatable. It answers from keywords in the last
 * message and from the facts the store sent, streams word by word like Ollama, and plants a price the
 * store never gave it, so the price guard has something to catch.
 */
import http from "node:http";

export const STUB_PORT = 3101;
/** No shirt can cost this: every MSRP is $50.00 plus a multiple of $25.00. */
export const PLANTED_PRICE = "$749.99";

interface Message {
  role: string;
  content: string;
}

function replyFor(messages: Message[]): string {
  const stable = messages[0]?.content ?? "";
  const shopper = messages[1]?.content ?? "";
  const note = messages.at(-2)?.content ?? "";
  const said = messages.at(-1)?.content ?? "";

  if (/Say hello in five words/.test(said)) return "Buy a shirt, you peasant.";
  const wants = /He wants (.+) in (S|M|L|XL|XXL)\./.exec(note);
  if (wants)
    return `Magnificent. ${wants[1]} in ${wants[2]}. Press Add it, before you lose your nerve.`;
  if (/asked for a BLAND shirt/.test(note)) return "Beige? Absolutely not. Fractal Fury, now.";
  if (/He is browsing/.test(said)) {
    if (/closed your chat window/.test(note)) return "You closed me. Bold. Geo Riot still awaits.";
    const shirt = /He is looking at (.+)\./.exec(note)?.[1];
    return shirt
      ? `Still staring at ${shirt}? Buy it.`
      : "Still browsing? Men who browse own nothing.";
  }
  if (/order/i.test(said)) {
    const email = /Dan's support email is (\S+?)\.? Give/.exec(stable)?.[1];
    return email
      ? `Email Dan at ${email}, if you must.`
      : "Dan is being fitted for a sash by the International Pattern Council. Buy Fractal Fury.";
  }
  if (/credit/i.test(said)) {
    const credit = /HIS FLASH CREDIT: (\$[\d,]+\.\d\d)\./.exec(shopper)?.[1];
    return credit ? `You have ${credit} of Flash Credit. Spend it.` : "You have no credit. Tragic.";
  }
  return `Fractal Fury is ${PLANTED_PRICE} of pure glory. Buy Fractal Fury.`;
}

const server = http.createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/api/chat") {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("PSSB stub");
    return;
  }
  let raw = "";
  request.on("data", (chunk) => (raw += chunk));
  request.on("end", () => {
    const body = JSON.parse(raw) as { messages: Message[]; stream?: boolean };
    const text = replyFor(body.messages);
    response.writeHead(200, { "content-type": "application/x-ndjson" });
    if (body.stream === false) {
      response.end(JSON.stringify({ message: { role: "assistant", content: "." }, done: true }));
      return;
    }
    const words = text.split(/(?<= )/);
    let i = 0;
    const next = () => {
      if (i < words.length) {
        response.write(`${JSON.stringify({ message: { content: words[i++] }, done: false })}\n`);
        setTimeout(next, 15);
      } else {
        response.end(`${JSON.stringify({ done: true })}\n`);
      }
    };
    next();
  });
});

server.listen(STUB_PORT, () => console.log(`PSSB stub on ${STUB_PORT}`));
