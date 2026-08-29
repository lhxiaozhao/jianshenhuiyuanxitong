import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type BenefitType = 'coupon' | 'trial' | 'test';

export interface BenefitAttributes {
  id: number;
  name: string;
  pointsCost: number;
  type: BenefitType;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BenefitCreationAttributes extends Optional<BenefitAttributes, 'id' | 'status'> {}

class Benefit extends Model<BenefitAttributes, BenefitCreationAttributes> implements BenefitAttributes {
  declare public id: number;
  declare public name: string;
  declare public pointsCost: number;
  declare public type: BenefitType;
  declare public status: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Benefit.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    pointsCost: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('coupon', 'trial', 'test'), allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
  },
  { sequelize, modelName: 'Benefit', tableName: 'benefits' }
);

export default Benefit;
