<template>
  <div class="dashboard">
    <template v-if="isMember">
      <el-row :gutter="16">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-label">
              钱包余额
            </div>
            <div class="stat-value">
              ￥{{ wallet?.balance ?? 0 }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-label">
              积分余额
            </div>
            <div class="stat-value">
              {{ wallet?.points ?? 0 }}
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-label">
              有效会籍
            </div>
            <div class="stat-value">
              {{ activeMemberships }}
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-card class="membership-card">
        <template #header>
          <span>我的会籍</span>
        </template>
        <el-table
          :data="memberships"
          stripe
        >
          <el-table-column
            label="卡类型"
            min-width="120"
          >
            <template #default="{ row }">
              {{ row.cardType?.name || `#${row.cardTypeId}` }}
            </template>
          </el-table-column>
          <el-table-column
            prop="startDate"
            label="开始日期"
            width="120"
          />
          <el-table-column
            prop="endDate"
            label="结束日期"
            width="120"
          />
          <el-table-column
            label="状态"
            width="100"
          >
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                {{ statusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <template v-else>
      <el-row
        v-if="stats.length > 0"
        :gutter="16"
        class="stat-row"
      >
        <el-col
          v-for="stat in stats"
          :key="stat.storeId"
          :span="8"
        >
          <el-card class="stat-card">
            <div class="stat-label">
              {{ storeName(stat.storeId) }}
            </div>
            <div class="stat-numbers">
              <div>会员总数：{{ stat.memberCount }}</div>
              <div>今日新增：{{ stat.newMemberCount }}</div>
              <div>预约数：{{ stat.bookingCount }}</div>
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-empty
        v-else
        description="暂无门店数据"
      />

      <el-card class="membership-card">
        <template #header>
          <span>即将到期会籍（7天内）</span>
        </template>
        <el-table
          v-loading="expiringLoading"
          :data="expiringMemberships"
          stripe
        >
          <el-table-column
            label="会员"
            min-width="140"
          >
            <template #default="{ row }">
              {{ row.member?.name }}（{{ row.member?.phone }}）
            </template>
          </el-table-column>
          <el-table-column
            label="卡类型"
            min-width="110"
          >
            <template #default="{ row }">
              {{ row.cardType?.name || `#${row.cardTypeId}` }}
            </template>
          </el-table-column>
          <el-table-column
            prop="endDate"
            label="到期日"
            width="120"
          />
          <el-table-column
            label="剩余天数"
            width="100"
          >
            <template #default="{ row }">
              {{ daysLeft(row.endDate) }} 天
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();
const isMember = auth.user?.role === 'member';

const wallet = ref<{ balance: number; points: number } | null>(null);
const memberships = ref<unknown[]>([]);
const stats = ref<{ storeId: number; memberCount: number; newMemberCount: number; bookingCount: number }[]>([]);
const expiringMemberships = ref<unknown[]>([]);
const expiringLoading = ref(false);

const activeMemberships = computed(() => memberships.value.filter((m) => (m as { status: string }).status === 'active').length);

function statusText(status: string): string {
  const map: Record<string, string> = { active: '生效中', expired: '已过期', frozen: '已冻结' };
  return map[status] || status;
}

function storeName(storeId: number): string {
  return storeId === 1 ? '主店' : `门店${storeId}`;
}

function daysLeft(endDate: string): number {
  const diff = new Date(`${endDate}T00:00:00`).getTime() - Date.now();
  return Math.max(Math.ceil(diff / 86400000), 0);
}

async function loadMemberDashboard(): Promise<void> {
  const memberId = auth.user?.id;
  if (!memberId) {
    return;
  }
  const [walletData, membershipData] = await Promise.all([
    request.get(`/wallets/${memberId}`),
    request.get(`/members/${memberId}/memberships`),
  ]);
  wallet.value = walletData;
  memberships.value = membershipData.list;
}

async function loadStaffDashboard(): Promise<void> {
  const storeData = await request.get('/stores');
  const stores = storeData.list;
  if (stores.length > 0) {
    const statResults = await Promise.all(
      stores.map((store: { id: number }) => request.get(`/stores/${store.id}/stats`))
    );
    stats.value = statResults;
  }
  expiringLoading.value = true;
  try {
    const data = await request.get('/memberships/expiring');
    expiringMemberships.value = data.list;
  } finally {
    expiringLoading.value = false;
  }
}

onMounted(() => {
  if (isMember) {
    loadMemberDashboard();
  } else {
    loadStaffDashboard();
  }
});
</script>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}

.stat-card {
  text-align: center;
}

.stat-label {
  color: #909399;
  font-size: 14px;
  margin-bottom: 12px;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
}

.stat-numbers {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
}

.membership-card {
  margin-top: 16px;
}
</style>
