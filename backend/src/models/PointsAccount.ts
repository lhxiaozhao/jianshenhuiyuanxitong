import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface PointsAccountAttributes {
  id: number;
  memberId: number;
  balance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PointsAccountCreationAttributes extends Optional<PointsAccountAttributes, 'id' | 'balance'> {}

class PointsAccount extends Model<PointsAccountAttributes, PointsAccountCreationAttributes> implements PointsAccountAttributes {
  public id!: number;
  public memberId!: number;
  public balance!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PointsAccount.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    balance: { type: DataTypes.INTEGER, defaultValue: 0 },
  },
  { sequelize, modelName: 'PointsAccount', tableName: 'points_accounts' }
);

export default PointsAccount;
