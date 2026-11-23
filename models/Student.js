import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Student = sequelize.define(
  "students",
  {
    uid: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    address: {
      type: DataTypes.TEXT,
    },
    company: {
      type: DataTypes.STRING,
    },
    interviewDate: {
      type: DataTypes.STRING,
    },
    departureDate: {
      type: DataTypes.TEXT,
    },

    image: {
      type: DataTypes.STRING,
    },
  },
  {
    hooks: {},
  }
);

export default Student;
