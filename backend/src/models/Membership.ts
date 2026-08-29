import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type MembershipStatus = 'active' | 'expired' | 'frozen';

export interface MembershipAttributes {
  id: number;
  memberId: number;
  cardTypeId: number;
  storeId: number;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MembershipCreationAttributes extends Optional<MembershipAttributes, 'id' | 'status'> {}

class Membership extends Model<MembershipAttributes, MembershipCreationAttributes> implements MembershipAttributes {
  public id!: number;
  public memberId!: number;
  public cardTypeId!: number;
  public storeId!: number;
  public startDate!: string;
  public endDate!: string;
  public status!: MembershipStatus;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Membership.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberId: { type: DataTypes.BIGINT, allowNull: false },
    cardTypeId: { type: DataTypes.BIGINT, allowNull: false },
    storeId: { type: DataTypes.BIGINT, allowNull: false },
    startDate: { type: DataTypes.DATEONLY, allowNull: false },
    endDate: { type: DataTypes.DATEONLY, allowNull: false },
    status: { type: DataTypes.ENUM('active', 'expired', 'frozen'), defaultValue: 'active' },
  },
  { sequelize, modelName: 'Membership', tableName: 'memberships' }
);

export default Membership;
