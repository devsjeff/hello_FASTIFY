import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify();

await app.register(cors, {
  origin: "http://localhost:3000",
});

app.get("/home", async () => {
  return "welcome home";
});

app.listen({ port: 8000 }, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  console.log(`Server running at ${address}`);
});

// MAIN THING -------------------
await app.register(cors, {
  origin: "http://localhost:3000",
});

// ---------------------------------------------

/*ALLOW MULTIPLE
Allow multiple frontends
You can use an array:
*/

await app.register(cors, {
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
  ],
});


/* allow everything

You can also do:

*/

await app.register(cors, {
  origin: true,
});


