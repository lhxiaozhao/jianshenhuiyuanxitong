import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type PointsRecordType = 'earn' | 'spend' | 'expire';

export interface PointsRecordAttributes {
  id: number;
  memberId: number;
  type: PointsRecordType;
  points: number;
  orderId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PointsRecordCreationAttributes extends Optional<PointsRecordAttributes, 'id' | 'orderId'> {}

class PointsRecord extends Model<PointsRecordAttributes, PointsRecordCreationAttributes> implements PointsRecordAttributes {
  declare public id: number;
  declare public memberId: number;
  declare public type: PointsRecordType;
  declare public points: number;
  declare public orderId: number | null;
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
  },
  { sequelize, modelName: 'PointsRecord', tableName: 'points_records' }
);

export default PointsRecord;
