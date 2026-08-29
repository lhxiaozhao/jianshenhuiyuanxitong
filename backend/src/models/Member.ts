import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MemberAttributes {
  id: number;
  memberNo: string;
  name: string;
  phone: string;
  gender: number | null;
  birthday: string | null;
  idCard: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  storeId: number;
  status: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MemberCreationAttributes extends Optional<MemberAttributes, 'id' | 'gender' | 'birthday' | 'idCard' | 'emergencyContact' | 'emergencyPhone' | 'status'> {}

class Member extends Model<MemberAttributes, MemberCreationAttributes> implements MemberAttributes {
  public id!: number;
  public memberNo!: string;
  public name!: string;
  public phone!: string;
  public gender!: number | null;
  public birthday!: string | null;
  public idCard!: string | null;
  public emergencyContact!: string | null;
  public emergencyPhone!: string | null;
  public storeId!: number;
  public status!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Member.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberNo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    gender: { type: DataTypes.TINYINT, allowNull: true },
    birthday: { type: DataTypes.DATEONLY, allowNull: true },
    idCard: { type: DataTypes.STRING(18), allowNull: true },
    emergencyContact: { type: DataTypes.STRING(50), allowNull: true },
    emergencyPhone: { type: DataTypes.STRING(20), allowNull: true },
    storeId: { type: DataTypes.BIGINT, allowNull: false },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
  },
  { sequelize, modelName: 'Member', tableName: 'members' }
);

export default Member;
