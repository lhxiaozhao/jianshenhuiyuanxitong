import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export interface MemberAttributes {
  id: number;
  memberNo: string;
  name: string;
  phone: string;
  passwordHash: string | null;
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

export interface MemberCreationAttributes extends Optional<MemberAttributes, 'id' | 'passwordHash' | 'gender' | 'birthday' | 'idCard' | 'emergencyContact' | 'emergencyPhone' | 'status'> {}

class Member extends Model<MemberAttributes, MemberCreationAttributes> implements MemberAttributes {
  declare public id: number;
  declare public memberNo: string;
  declare public name: string;
  declare public phone: string;
  declare public passwordHash: string | null;
  declare public gender: number | null;
  declare public birthday: string | null;
  declare public idCard: string | null;
  declare public emergencyContact: string | null;
  declare public emergencyPhone: string | null;
  declare public storeId: number;
  declare public status: number;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
}

Member.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    memberNo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: true },
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
