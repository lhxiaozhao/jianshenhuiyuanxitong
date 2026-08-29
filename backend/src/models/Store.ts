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
  public id!: number;
  public name!: string;
  public address!: string | null;
  public phone!: string | null;
  public businessHours!: string | null;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
