import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = (req, res, next) => {
  try {
    const authHeader =
      req.headers.authorization;

    if (
      !authHeader ||
      !authHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        msg: "Access token tidak ditemukan",
      });
    }

    const token =
      authHeader.substring(7);

    const decoded =
      verifyAccessToken(token);

    if (
      !decoded ||
      decoded.type !== "access"
    ) {
      return res.status(401).json({
        success: false,
        msg: "Access token tidak valid",
      });
    }

    req.user = {
      uuid: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({
        success: false,
        msg: "Access token telah kadaluarsa",
      });
    }

    return res.status(401).json({
      success: false,
      msg: "Access token tidak valid",
    });
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        msg: "Unauthorized",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        msg: "Anda tidak memiliki izin untuk mengakses resource ini",
      });
    }

    next();
  };
};
