import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface OperationLogAttributes {
  id: number;
  userId: number | null;
  action: string;
  detail: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OperationLogCreationAttributes extends Optional<OperationLogAttributes, 'id' | 'userId' | 'detail'> {}

class OperationLog extends Model<OperationLogAttributes, OperationLogCreationAttributes> implements OperationLogAttributes {
  public id!: number;
  public userId!: number | null;
  public action!: string;
  public detail!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

OperationLog.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.BIGINT, allowNull: true },
    action: { type: DataTypes.STRING(100), allowNull: false },
    detail: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'OperationLog', tableName: 'operation_logs' }
);

export default OperationLog;
