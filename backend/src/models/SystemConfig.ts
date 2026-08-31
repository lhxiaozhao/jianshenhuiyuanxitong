import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface SystemConfigAttributes {
  id: number;
  key: string;
  value: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SystemConfigCreationAttributes extends Optional<SystemConfigAttributes, 'id'> {}

class SystemConfig extends Model<SystemConfigAttributes, SystemConfigCreationAttributes> implements SystemConfigAttributes {
  declare public id: number;
  declare public key: string;
  declare public value: string;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

SystemConfig.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    key: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    value: { type: DataTypes.STRING(255), allowNull: false },
  },
  { sequelize, modelName: 'SystemConfig', tableName: 'system_configs' }
);

export default SystemConfig;
