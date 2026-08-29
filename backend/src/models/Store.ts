import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface StoreAttributes {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  businessHours: string | null;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface StoreCreationAttributes extends Optional<StoreAttributes, 'id' | 'address' | 'phone' | 'businessHours' | 'status'> {}

class Store extends Model<StoreAttributes, StoreCreationAttributes> implements StoreAttributes {
  declare public id: number;
  declare public name: string;
  declare public address: string | null;
  declare public phone: string | null;
  declare public businessHours: string | null;
  declare public status: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Store.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    address: { type: DataTypes.STRING(255), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    businessHours: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
  },
  { sequelize, modelName: 'Store', tableName: 'stores' }
);

export default Store;
