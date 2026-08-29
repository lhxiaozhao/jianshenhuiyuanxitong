import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface CardTypeAttributes {
  id: number;
  name: string;
  durationDays: number;
  price: number;
  status: number;
  benefitsDesc: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CardTypeCreationAttributes extends Optional<CardTypeAttributes, 'id' | 'benefitsDesc' | 'status'> {}

class CardType extends Model<CardTypeAttributes, CardTypeCreationAttributes> implements CardTypeAttributes {
  public id!: number;
  public name!: string;
  public durationDays!: number;
  public price!: number;
  public status!: number;
  public benefitsDesc!: string | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CardType.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    durationDays: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    benefitsDesc: { type: DataTypes.TEXT, allowNull: true },
  },
  { sequelize, modelName: 'CardType', tableName: 'card_types' }
);

export default CardType;
