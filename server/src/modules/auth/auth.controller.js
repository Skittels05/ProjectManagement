const authService = require("./auth.service");

async function register(req, res) {
  const { refreshToken, ...payload } = await authService.register(req.body);

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(201)
    .json(payload);
}

async function login(req, res) {
  const { refreshToken, ...payload } = await authService.login(req.body);

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(200)
    .json(payload);
}

async function refresh(req, res) {
  const { refreshToken, ...payload } = await authService.refresh(
    req.cookies.refreshToken,
  );

  res
    .cookie("refreshToken", refreshToken, authService.getRefreshCookieConfig())
    .status(200)
    .json(payload);
}

async function logout(req, res) {
  await authService.logout(req.cookies.refreshToken);
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
}

async function me(req, res) {
  const user = await authService.getCurrentUser(req.user.id);
  res.status(200).json({ user });
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
};
