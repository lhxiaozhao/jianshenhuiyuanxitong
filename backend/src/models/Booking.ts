import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

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
  public id!: number;
  public memberId!: number;
  public courseId!: number;
  public status!: BookingStatus;
  public bookedAt!: Date;
  public cancelledAt!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
