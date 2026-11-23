import express from "express";
import {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from "../controllers/studentController.js";

// import { authenticate, authorize } from "../middlewares/auth.js";
import { uploadImage } from "../middlewares/Image.js";

const router = express.Router();

// READ
router.get("/", getStudents);
router.get("/:id", getStudentById);

// CREATE
router.post(
  "/",
  // authenticate,
  // authorize("admin"),
  uploadImage.single("image"),
  createStudent
);

// UPDATE
router.put(
  "/:id",
  // authenticate,
  // authorize("admin"),
  uploadImage.single("image"),
  updateStudent
);

// DELETE
router.delete(
  "/:id",
  //  authenticate, authorize("admin"),
  deleteStudent
);

export default router;
