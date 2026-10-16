import { createServer } from "node:http";
import { createApp } from "./app.js";
import { PaymentStore } from "./payment-store.js";

const port = Number(process.env.PORT ?? 3002);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error("PORT debe ser un puerto TCP válido.");
}

const paymentStore = new PaymentStore({
  historyPath: process.env.PAYMENT_HISTORY_FILE,
  walletsPath: process.env.PAYMENT_WALLETS_FILE,
});
const server = createServer(createApp({ paymentStore }));

server.on("error", (error) => {
  process.stderr.write(
    `W2 server could not listen on port ${port}: ${error.message}\n`,
  );
  process.exitCode = 1;
});
server.listen(port, () => {
  process.stdout.write(`W2 payment service listening on port ${port}\n`);
});
