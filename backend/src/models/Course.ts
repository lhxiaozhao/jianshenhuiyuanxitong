import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type CourseType = 'group' | 'private';
export type CourseStatus = 'open' | 'full' | 'closed';

export interface CourseAttributes {
  id: number;
  name: string;
  type: CourseType;
  trainerId: number;
  storeId: number;
  durationMinutes: number;
  capacity: number | null;
  startTime: Date;
  price: number | null;
  status: CourseStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CourseCreationAttributes extends Optional<CourseAttributes, 'id' | 'capacity' | 'price' | 'status'> {}

class Course extends Model<CourseAttributes, CourseCreationAttributes> implements CourseAttributes {
  declare public id: number;
  declare public name: string;
  declare public type: CourseType;
  declare public trainerId: number;
  declare public storeId: number;
  declare public durationMinutes: number;
  declare public capacity: number | null;
  declare public startTime: Date;
  declare public price: number | null;
  declare public status: CourseStatus;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Course.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    type: { type: DataTypes.ENUM('group', 'private'), allowNull: false },
    trainerId: { type: DataTypes.BIGINT, allowNull: false },
    storeId: { type: DataTypes.BIGINT, allowNull: false },
    durationMinutes: { type: DataTypes.INTEGER, allowNull: false },
    capacity: { type: DataTypes.INTEGER, allowNull: true },
    startTime: { type: DataTypes.DATE, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    status: { type: DataTypes.ENUM('open', 'full', 'closed'), defaultValue: 'open' },
  },
  { sequelize, modelName: 'Course', tableName: 'courses' }
);

export default Course;
