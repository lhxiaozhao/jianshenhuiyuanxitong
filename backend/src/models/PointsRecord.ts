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
  public id!: number;
  public memberId!: number;
  public type!: PointsRecordType;
  public points!: number;
  public orderId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
