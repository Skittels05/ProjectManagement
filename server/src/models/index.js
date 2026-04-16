const { sequelize } = require("../config/database");
const { defineUser } = require("./user.model");
const { defineRefreshToken } = require("./refresh-token.model");

const User = defineUser(sequelize);
const RefreshToken = defineRefreshToken(sequelize);

User.hasMany(RefreshToken, {
  foreignKey: "userId",
  as: "refreshTokens",
});

RefreshToken.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

module.exports = {
  sequelize,
  User,
  RefreshToken,
};
