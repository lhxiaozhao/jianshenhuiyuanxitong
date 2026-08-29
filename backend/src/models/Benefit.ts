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
  public id!: number;
  public name!: string;
  public pointsCost!: number;
  public type!: BenefitType;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
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
