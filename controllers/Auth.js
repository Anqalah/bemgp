import argon2 from "argon2";
import jwt from "jsonwebtoken";
import Users from "../models/UsersModel.js";
import RefreshTokens from "../models/RefreshTokenModel.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";
import { hashToken } from "../utils/tokenHash.js";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "../config/AuthCookie.js";

export const Login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Email dan password harus diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await Users.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "Email atau password salah",
      });
    }

    const passwordValid = await argon2.verify(user.password, password);

    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        msg: "Email atau password salah",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    const refreshTokenHash = hashToken(refreshToken);
    const refreshTokenDecoded = jwt.decode(refreshToken);

    await RefreshTokens.create({
      userUuid: user.uuid,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(refreshTokenDecoded.exp * 1000),
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
    return res.status(200).json({
      success: true,
      msg: "Login berhasil",
      accessToken,
      user: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      msg: "Terjadi kesalahan pada server",
    });
  }
};

export const Me = async (req, res) => {
  try {
    const user = await Users.findOne({
      attributes: [
        "uuid",
        "name",
        "email",
        "role",
        "institution",
        "hp",
        "profile",
      ],
      where: {
        uuid: req.user.uuid,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        msg: "User tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Me error:", error);

    return res.status(500).json({
      success: false,
      msg: "Terjadi kesalahan pada server",
    });
  }
};

export const Register = async (req, res) => {
  try {
    const { name, email, hp, password, institution } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        msg: "Nama, email, dan password wajib diisi",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        msg: "Password minimal 6 karakter",
      });
    }

    const existing = await Users.findOne({
      where: {
        email: normalizedEmail,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        msg: "Email sudah terdaftar",
      });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await Users.create({
      name: name.trim(),
      email: normalizedEmail,
      hp: hp || null,
      password: hashedPassword,
      // Role default
      role: "user",
      institution: institution || null,
    });

    return res.status(201).json({
      success: true,
      msg: "Registrasi berhasil",
      data: {
        uuid: user.uuid,
        name: user.name,
        email: user.email,
        role: user.role,
        institution: user.institution,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      msg: "Terjadi kesalahan pada server",
    });
  }
};

export const Logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken);
      await RefreshTokens.update(
        {
          revokedAt: new Date(),
        },
        {
          where: {
            tokenHash,
            revokedAt: null,
          },
        }
      );
    }
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    return res.status(200).json({
      success: true,
      msg: "Logout berhasil",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
    return res.status(200).json({
      success: true,
      msg: "Logout berhasil",
    });
  }
};

export const Refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        msg: "Refresh token tidak ditemukan",
      });
    }
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return res.status(401).json({
        success: false,
        msg: "Refresh token tidak valid atau telah kadaluarsa",
      });
    }
    if (!decoded || decoded.type !== "refresh" || !decoded.sub) {
      return res.status(401).json({
        success: false,
        msg: "Refresh token tidak valid",
      });
    }
    const tokenHash = hashToken(refreshToken);
    const storedToken = await RefreshTokens.findOne({
      where: {
        tokenHash,
      },
    });
    if (!storedToken) {
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return res.status(401).json({
        success: false,
        msg: "Refresh token tidak ditemukan",
      });
    }
    // Token sudah pernah digunakan/revoke
    if (storedToken.revokedAt) {
      await RefreshTokens.update(
        {
          revokedAt: new Date(),
        },
        {
          where: {
            userUuid: storedToken.userUuid,
            revokedAt: null,
          },
        }
      );
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return res.status(401).json({
        success: false,
        msg: "Session tidak valid. Silakan login kembali.",
      });
    }
    // Database expiration check
    if (new Date(storedToken.expiresAt) <= new Date()) {
      await storedToken.update({
        revokedAt: new Date(),
      });
      res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
      return res.status(401).json({
        success: false,
        msg: "Waktu login telah habis. Silakan login kembali.",
      });
    }
    const user = await Users.findOne({
      where: {
        uuid: decoded.sub,
      },
    });
    if (!user) {
      return res.status(401).json({
        success: false,
        msg: "User tidak ditemukan",
      });
    }
    const newRefreshToken = generateRefreshToken(user);
    const newRefreshTokenHash = hashToken(newRefreshToken);
    const newDecoded = jwt.decode(newRefreshToken);
    await storedToken.update({
      revokedAt: new Date(),
      replacedByTokenHash: newRefreshTokenHash,
    });

    await RefreshTokens.create({
      userUuid: user.uuid,
      tokenHash: newRefreshTokenHash,
      expiresAt: new Date(newDecoded.exp * 1000),
      userAgent: req.get("user-agent"),
      ipAddress: req.ip,
    });
    const newAccessToken = generateAccessToken(user);
    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, refreshCookieOptions);
    return res.status(200).json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);

    return res.status(500).json({
      success: false,
      msg: "Terjadi kesalahan pada server",
    });
  }
};

export const ForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, msg: "Email wajib diisi" });
    }
    // TODO: generate token reset, kirim email
    // Selalu balas sukses agar tidak membocorkan apakah email terdaftar
    return res.status(200).json({
      success: true,
      msg: "Jika email terdaftar, tautan reset telah dikirim.",
    });
  } catch (error) {
    console.error("ForgotPassword error:", error);
    return res
      .status(500)
      .json({ success: false, msg: "Terjadi kesalahan pada server" });
  }
};
