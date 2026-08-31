import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type OrderType = 'recharge' | 'card' | 'course';
export type PayMethod = 'cash' | 'wechat' | 'alipay' | 'balance';
export type OrderStatus = 'pending' | 'paid' | 'cancelled';

export interface OrderAttributes {
  id: number;
  orderNo: string;
  memberId: number;
  type: OrderType;
  amount: number;
  payMethod: PayMethod | null;
  status: OrderStatus;
  storeId: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface OrderCreationAttributes extends Optional<OrderAttributes, 'id' | 'payMethod' | 'status' | 'storeId'> {}

class Order extends Model<OrderAttributes, OrderCreationAttributes> implements OrderAttributes {
  declare public id: number;
  declare public orderNo: string;
  declare public memberId: number;
  declare public type: OrderType;
  declare public amount: number;
  declare public payMethod: PayMethod | null;
  declare public status: OrderStatus;
  declare public storeId: number | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Order.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('recharge', 'card', 'course'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payMethod: { type: DataTypes.ENUM('cash', 'wechat', 'alipay', 'balance'), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'paid', 'cancelled'), defaultValue: 'pending' },
    storeId: { type: DataTypes.BIGINT, allowNull: true },
  },
  { sequelize, modelName: 'Order', tableName: 'orders' }
);

export default Order;
