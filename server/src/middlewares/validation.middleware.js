const { validationResult } = require("express-validator");
const { AppError } = require("../utils/app-error");

function validationMiddleware(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(new AppError("Validation failed", 400, result.array()));
}

module.exports = { validationMiddleware };
