import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type ExchangeStatus = 'completed' | 'used';

export interface PointExchangeAttributes {
  id: number;
  memberId: number;
  benefitId: number;
  pointsCost: number;
  status: ExchangeStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PointExchangeCreationAttributes extends Optional<PointExchangeAttributes, 'id' | 'status'> {}

class PointExchange extends Model<PointExchangeAttributes, PointExchangeCreationAttributes> implements PointExchangeAttributes {
  public id!: number;
  public memberId!: number;
  public benefitId!: number;
  public pointsCost!: number;
  public status!: ExchangeStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PointExchange.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    benefitId: { type: DataTypes.BIGINT, allowNull: false },
    pointsCost: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM('completed', 'used'), defaultValue: 'completed' },
  },
  { sequelize, modelName: 'PointExchange', tableName: 'point_exchanges' }
);

export default PointExchange;
