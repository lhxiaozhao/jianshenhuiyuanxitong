import { sequelize } from '../config/database';

import Store from './Store';
import User from './User';
import Member from './Member';
import CardType from './CardType';
import Membership from './Membership';
import Course from './Course';
import Booking from './Booking';
import Order from './Order';
import Wallet from './Wallet';
import Transaction from './Transaction';
import PointsAccount from './PointsAccount';
import PointsRecord from './PointsRecord';
import Benefit from './Benefit';
import PointExchange from './PointExchange';
import OperationLog from './OperationLog';
import SystemConfig from './SystemConfig';

Store.hasMany(Member, { foreignKey: 'storeId', as: 'members' });
Store.hasMany(User, { foreignKey: 'storeId', as: 'users' });
Store.hasMany(Course, { foreignKey: 'storeId', as: 'courses' });
Store.hasMany(CardType, { foreignKey: 'storeId', as: 'cardTypes' });
Store.hasMany(Membership, { foreignKey: 'storeId', as: 'memberships' });
Store.hasMany(Order, { foreignKey: 'storeId', as: 'orders' });
Member.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
User.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Course.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });
Order.belongsTo(Store, { foreignKey: 'storeId', as: 'store' });

Member.hasMany(Membership, { foreignKey: 'memberId', as: 'memberships' });
Membership.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
CardType.hasMany(Membership, { foreignKey: 'cardTypeId', as: 'memberships' });
Membership.belongsTo(CardType, { foreignKey: 'cardTypeId', as: 'cardType' });

User.hasMany(Course, { foreignKey: 'trainerId', as: 'courses' });
Course.belongsTo(User, { foreignKey: 'trainerId', as: 'trainer' });

Member.hasMany(Booking, { foreignKey: 'memberId', as: 'bookings' });
Booking.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
Course.hasMany(Booking, { foreignKey: 'courseId', as: 'bookings' });
Booking.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Member.hasMany(Order, { foreignKey: 'memberId', as: 'orders' });
Order.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

Member.hasOne(Wallet, { foreignKey: 'memberId', as: 'wallet' });
Wallet.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
Wallet.hasMany(Transaction, { foreignKey: 'walletId', as: 'transactions' });
Transaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
Transaction.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Member.hasMany(Transaction, { foreignKey: 'memberId', as: 'transactions' });

Member.hasOne(PointsAccount, { foreignKey: 'memberId', as: 'pointsAccount' });
PointsAccount.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
Member.hasMany(PointsRecord, { foreignKey: 'memberId', as: 'pointsRecords' });
PointsRecord.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });
PointsRecord.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

Benefit.hasMany(PointExchange, { foreignKey: 'benefitId', as: 'exchanges' });
PointExchange.belongsTo(Benefit, { foreignKey: 'benefitId', as: 'benefit' });
Member.hasMany(PointExchange, { foreignKey: 'memberId', as: 'pointExchanges' });
PointExchange.belongsTo(Member, { foreignKey: 'memberId', as: 'member' });

User.hasMany(OperationLog, { foreignKey: 'userId', as: 'operationLogs' });
OperationLog.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export {
  sequelize,
  Store,
  User,
  Member,
  CardType,
  Membership,
  Course,
  Booking,
  Order,
  Wallet,
  Transaction,
  PointsAccount,
  PointsRecord,
  Benefit,
  PointExchange,
  OperationLog,
  SystemConfig,
};

export async function initModels(): Promise<void> {
  await sequelize.sync();
}
