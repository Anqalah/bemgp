// controllers/studentController.js
import Student from "../models/Student.js";
import fs from "fs";
import path from "path";

// ===== Helper: generate UID unik =====
const generateUID = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0");
  return `MGP-${timestamp}-${random}`;
};

// ==========================================
// HELPER: DELETE LOCAL IMAGE
// ==========================================
const deleteLocalImage = (imagePath) => {
  if (!imagePath) return;
  const filename = path.basename(imagePath);
  const fullPath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "image",
    filename
  );
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
};

// =================== CREATE ===================
export const createStudent = async (req, res) => {
  try {
    const { name, address, company, interviewDate, departureDate } = req.body;
    const image = req.file
      ? `${process.env.BASE_URL}/uploads/image/${req.file.filename}`
      : null;
    const uid = req.body.uid || generateUID();
    const student = await Student.create({
      uid,
      name,
      address,
      company,
      interviewDate,
      departureDate,
      image,
    });
    return res.status(201).json({
      success: true,
      message: "Siswa berhasil ditambahkan",
      data: student,
    });
  } catch (error) {
    if (req.file) {
      deleteLocalImage(req.file.filename);
    }
    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan siswa",
      error: error.message,
    });
  }
};

// ==========================================
// UPDATE STUDENT
// ==========================================
export const updateStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      if (req.file) {
        deleteLocalImage(req.file.filename);
      }

      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan",
      });
    }

    const { name, address, company, interviewDate, departureDate } = req.body;

    const data = {};

    if (name !== undefined) data.name = name;
    if (address !== undefined) data.address = address;
    if (company !== undefined) data.company = company;
    if (interviewDate !== undefined) data.interviewDate = interviewDate;
    if (departureDate !== undefined) data.departureDate = departureDate;

    if (req.file) {
      data.image = `${process.env.BASE_URL}/uploads/image/${req.file.filename}`;
    }

    const oldImage = student.image;

    await student.update(data);

    if (req.file && oldImage) {
      deleteLocalImage(oldImage);
    }

    return res.status(200).json({
      success: true,
      message: "Data siswa berhasil diperbarui",
      data: student,
    });
  } catch (error) {
    if (req.file) {
      deleteLocalImage(req.file.filename);
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui data siswa",
      error: error.message,
    });
  }
};

// ==========================================
// GET ALL STUDENTS
// ==========================================
export const getStudents = async (req, res) => {
  try {
    const students = await Student.findAll({
      order: [["createdAt", "DESC"]],
    });

    return res.status(200).json({
      success: true,
      total: students.length,
      data: students,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data siswa",
      error: error.message,
    });
  }
};

// ==========================================
// GET STUDENT BY ID
// ==========================================
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan",
      });
    }

    return res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail siswa",
      error: error.message,
    });
  }
};

// ==========================================
// DELETE STUDENT
// ==========================================
export const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByPk(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Siswa tidak ditemukan",
      });
    }

    const image = student.image;

    await student.destroy();

    if (image) {
      deleteLocalImage(image);
    }

    return res.status(200).json({
      success: true,
      message: "Siswa berhasil dihapus",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Gagal menghapus siswa",
      error: error.message,
    });
  }
};
