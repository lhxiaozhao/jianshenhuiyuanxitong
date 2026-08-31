import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type PointsRecordType = 'earn' | 'spend' | 'expire';

export interface PointsRecordAttributes {
  id: number;
  memberId: number;
  type: PointsRecordType;
  points: number;
  orderId: number | null;
  expireAt: Date | null;
  expiredAt: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PointsRecordCreationAttributes extends Optional<PointsRecordAttributes, 'id' | 'orderId' | 'expireAt' | 'expiredAt'> {}

class PointsRecord extends Model<PointsRecordAttributes, PointsRecordCreationAttributes> implements PointsRecordAttributes {
  declare public id: number;
  declare public memberId: number;
  declare public type: PointsRecordType;
  declare public points: number;
  declare public orderId: number | null;
  declare public expireAt: Date | null;
  declare public expiredAt: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

PointsRecord.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('earn', 'spend', 'expire'), allowNull: false },
    points: { type: DataTypes.INTEGER, allowNull: false },
    orderId: { type: DataTypes.BIGINT, allowNull: true },
    expireAt: { type: DataTypes.DATE, allowNull: true },
    expiredAt: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'PointsRecord', tableName: 'points_records' }
);

export default PointsRecord;
