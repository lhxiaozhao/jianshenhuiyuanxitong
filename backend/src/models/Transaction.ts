import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type TransactionType = 'recharge' | 'consume' | 'refund';

export interface TransactionAttributes {
  id: number;
  memberId: number;
  walletId: number;
  type: TransactionType;
  amount: number;
  orderId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TransactionCreationAttributes extends Optional<TransactionAttributes, 'id' | 'orderId'> {}

class Transaction extends Model<TransactionAttributes, TransactionCreationAttributes> implements TransactionAttributes {
  public id!: number;
  public memberId!: number;
  public walletId!: number;
  public type!: TransactionType;
  public amount!: number;
  public orderId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Transaction.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    walletId: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('recharge', 'consume', 'refund'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    orderId: { type: DataTypes.BIGINT, allowNull: true },
  },
  { sequelize, modelName: 'Transaction', tableName: 'transactions' }
);

export default Transaction;
