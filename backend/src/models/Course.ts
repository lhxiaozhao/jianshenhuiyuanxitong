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
  public id!: number;
  public name!: string;
  public type!: CourseType;
  public trainerId!: number;
  public storeId!: number;
  public durationMinutes!: number;
  public capacity!: number | null;
  public startTime!: Date;
  public price!: number | null;
  public status!: CourseStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
