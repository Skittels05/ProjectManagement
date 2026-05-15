import { app } from "./app";
import { env } from "./config/env";
import { initializeDatabase } from "./config/database";

async function bootstrap(): Promise<void> {
  await initializeDatabase();

  app.listen(env.port, () => {
    console.log(`Server is running on port ${env.port}`);
  });
}

void bootstrap();
