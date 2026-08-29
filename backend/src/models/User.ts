import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export type UserRole = 'admin' | 'frontdesk' | 'trainer';

export interface UserAttributes {
  id: number;
  username: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  storeId: number | null;
  status: number;
  failedAttempts: number;
  lockedUntil: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'storeId' | 'status' | 'failedAttempts' | 'lockedUntil'> {}

class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public username!: string;
  public passwordHash!: string;
  public name!: string;
  public role!: UserRole;
  public storeId!: number | null;
  public status!: number;
  public failedAttempts!: number;
  public lockedUntil!: Date | null;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

User.init(
  {
    id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false },
    name: { type: DataTypes.STRING(50), allowNull: false },
    role: { type: DataTypes.ENUM('admin', 'frontdesk', 'trainer'), allowNull: false },
    storeId: { type: DataTypes.BIGINT, allowNull: true },
    status: { type: DataTypes.TINYINT, defaultValue: 1 },
    failedAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
    lockedUntil: { type: DataTypes.DATE, allowNull: true },
  },
  { sequelize, modelName: 'User', tableName: 'users' }
);

export default User;
