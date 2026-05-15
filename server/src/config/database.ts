import { Sequelize } from "sequelize";
import { env } from "./env";

export const sequelize = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
  host: env.dbHost,
  port: env.dbPort,
  dialect: "postgres",
  logging: false,
});

export async function initializeDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    if (env.dbAutoSync) {
      await sequelize.sync();
      console.log("Database synchronized");
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn("Database connection unavailable:", msg);
  }
}
