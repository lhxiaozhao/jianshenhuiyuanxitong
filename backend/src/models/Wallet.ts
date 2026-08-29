import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface WalletAttributes {
  id: number;
  memberId: number;
  balance: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WalletCreationAttributes extends Optional<WalletAttributes, 'id' | 'balance'> {}

class Wallet extends Model<WalletAttributes, WalletCreationAttributes> implements WalletAttributes {
  declare public id: number;
  declare public memberId: number;
  declare public balance: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Wallet.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false, unique: true },
    balance: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  },
  { sequelize, modelName: 'Wallet', tableName: 'wallets' }
);

export default Wallet;
