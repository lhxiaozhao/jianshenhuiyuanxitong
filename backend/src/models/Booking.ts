import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';
import type Course from './Course';
import type Member from './Member';

export type BookingStatus = 'booked' | 'completed' | 'cancelled' | 'waiting';

export interface BookingAttributes {
  id: number;
  memberId: number;
  courseId: number;
  status: BookingStatus;
  bookedAt: Date;
  cancelledAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BookingCreationAttributes extends Optional<BookingAttributes, 'id' | 'status' | 'cancelledAt'> {}

class Booking extends Model<BookingAttributes, BookingCreationAttributes> implements BookingAttributes {
  declare public id: number;
  declare public memberId: number;
  declare public courseId: number;
  declare public status: BookingStatus;
  declare public bookedAt: Date;
  declare public cancelledAt: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
  declare public course?: Course;
  declare public member?: Member;
}

Booking.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    courseId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.ENUM('booked', 'completed', 'cancelled', 'waiting'), defaultValue: 'booked' },
    bookedAt: { type: DataTypes.DATE, allowNull: false },
    cancelledAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'Booking', tableName: 'bookings' }
);

export default Booking;
