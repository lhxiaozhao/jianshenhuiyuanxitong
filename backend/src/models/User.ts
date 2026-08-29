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
  declare public id: number;
  declare public username: string;
  declare public passwordHash: string;
  declare public name: string;
  declare public role: UserRole;
  declare public storeId: number | null;
  declare public status: number;
  declare public failedAttempts: number;
  declare public lockedUntil: Date | null;
  declare public readonly createdAt: Date;
  declare public readonly updatedAt: Date;
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
