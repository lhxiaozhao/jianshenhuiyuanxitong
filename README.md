# 健身会员系统

基于 Vue3 + Node.js(Express) + MariaDB(MySQL 兼容) 的健身场馆会员管理平台，支持多门店运营。

## 功能模块

- 会员管理：注册、资料、状态管理
- 会籍/套餐：卡类型、购卡、续费、到期管理
- 课程/预约：课程管理、预约/取消、消课确认
- 消费/支付：余额充值（模拟支付）、消费、账单、退款
- 积分/权益：积分累计、兑换、过期处理
- 门店管理：多门店、适用门店、门店数据隔离

## 目录结构

```
backend/    # Express + Sequelize REST API
frontend/   # Vue3 + Vite + Element Plus 前端
```

## 启动

```bash
# 初始化数据库（首次）
cd backend && npm run db:init

# 启动前后端服务
./start.sh
```

前端开发服务器（5173 端口）已配置 `/api` 反向代理到后端（3001 端口）。

## 规格文档

- `.monkeycode/specs/fitness-membership-system/requirements.md` - 需求文档
- `.monkeycode/specs/fitness-membership-system/design.md` - 技术设计
- `.monkeycode/specs/fitness-membership-system/tasklist.md` - 实施计划
