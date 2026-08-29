import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type OrderType = 'recharge' | 'card' | 'course';
export type PayMethod = 'cash' | 'wechat' | 'alipay';
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
  public id!: number;
  public orderNo!: string;
  public memberId!: number;
  public type!: OrderType;
  public amount!: number;
  public payMethod!: PayMethod | null;
  public status!: OrderStatus;
  public storeId!: number | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Order.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    orderNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    type: { type: DataTypes.ENUM('recharge', 'card', 'course'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payMethod: { type: DataTypes.ENUM('cash', 'wechat', 'alipay'), allowNull: true },
    status: { type: DataTypes.ENUM('pending', 'paid', 'cancelled'), defaultValue: 'pending' },
    storeId: { type: DataTypes.BIGINT, allowNull: true },
  },
  { sequelize, modelName: 'Order', tableName: 'orders' }
);

export default Order;
