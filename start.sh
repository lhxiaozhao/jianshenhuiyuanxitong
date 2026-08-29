#!/bin/bash
# 启动健身会员系统（后端 + 前端）

# 启动后端服务
cd /workspace/backend && npm run dev &
BACKEND_PID=$!

# 启动前端服务（暴露端口）
cd /workspace/frontend && npm run dev &
FRONTEND_PID=$!

# 清理
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT

wait
