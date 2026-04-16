const { app } = require("./app");
const { env } = require("./config/env");
const { initializeDatabase } = require("./config/database");

async function bootstrap() {
  await initializeDatabase();

  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });
}

bootstrap();
