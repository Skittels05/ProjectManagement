const { Sequelize } = require("sequelize");
const { env } = require("./env");

const sequelize = new Sequelize(env.dbName, env.dbUser, env.dbPassword, {
  host: env.dbHost,
  port: env.dbPort,
  dialect: "postgres",
  logging: false,
});

async function initializeDatabase() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established");

    if (env.dbAutoSync) {
      await sequelize.sync();
      console.log("Database synchronized");
    }
  } catch (error) {
    console.warn("Database connection unavailable:", error.message);
  }
}

module.exports = {
  sequelize,
  initializeDatabase,
};
