<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>钱包与账单</span>
          <div v-if="!isMember">
            <el-button
              type="primary"
              plain
              @click="openRecharge"
            >
              充值
            </el-button>
            <el-button
              type="primary"
              plain
              @click="openConsume"
            >
              消费
            </el-button>
          </div>
        </div>
      </template>

      <div
        v-if="!isMember"
        class="member-picker"
      >
        <el-select
          v-model="selectedMemberId"
          filterable
          placeholder="选择会员"
          style="width: 280px"
          @change="loadWallet"
        >
          <el-option
            v-for="member in members"
            :key="member.id"
            :label="`${member.name} (${member.phone})`"
            :value="member.id"
          />
        </el-select>
      </div>

      <el-descriptions
        v-if="wallet"
        :column="3"
        border
        class="wallet-info"
      >
        <el-descriptions-item label="会员">
          {{ memberName }}
        </el-descriptions-item>
        <el-descriptions-item label="钱包余额">
          <span class="amount">￥{{ wallet.balance }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="积分">
          {{ wallet.points }}
        </el-descriptions-item>
      </el-descriptions>

      <div class="filter-bar">
        <el-select
          v-model="query.type"
          placeholder="流水类型"
          clearable
          style="width: 150px"
          @change="fetchTransactions"
        >
          <el-option
            label="充值"
            value="recharge"
          />
          <el-option
            label="消费"
            value="consume"
          />
          <el-option
            label="退款"
            value="refund"
          />
        </el-select>
        <el-date-picker
          v-model="query.range"
          type="daterange"
          value-format="YYYY-MM-DD"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="fetchTransactions"
        />
        <el-button
          type="primary"
          @click="fetchTransactions"
        >
          查询
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="transactions"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
        />
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="typeTagType(row.type)">
              {{ typeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="金额"
          width="120"
        >
          <template #default="{ row }">
            <span :class="Number(row.amount) >= 0 ? 'amount-in' : 'amount-out'">
              {{ Number(row.amount) >= 0 ? '+' : '' }}{{ row.amount }}
            </span>
          </template>
        </el-table-column>
        <el-table-column
          label="订单号"
          min-width="150"
        >
          <template #default="{ row }">
            {{ row.order?.orderNo || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="支付方式"
          width="100"
        >
          <template #default="{ row }">
            {{ payMethodText(row.order?.payMethod) }}
          </template>
        </el-table-column>
        <el-table-column
          label="时间"
          min-width="170"
        >
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column
          v-if="!isMember"
          label="操作"
          width="100"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              v-if="row.type === 'consume'"
              link
              type="danger"
              @click="openRefund(row)"
            >
              退款
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="rechargeVisible"
      title="余额充值"
      width="420px"
    >
      <el-form
        ref="rechargeFormRef"
        :model="rechargeForm"
        :rules="rechargeRules"
        label-width="90px"
      >
        <el-form-item
          label="充值金额"
          prop="amount"
        >
          <el-input-number
            v-model="rechargeForm.amount"
            :min="1"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="支付方式"
          prop="payMethod"
        >
          <el-radio-group v-model="rechargeForm.payMethod">
            <el-radio value="cash">
              现金
            </el-radio>
            <el-radio value="wechat">
              微信
            </el-radio>
            <el-radio value="alipay">
              支付宝
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleRecharge"
        >
          确认充值
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="consumeVisible"
      title="余额消费"
      width="420px"
    >
      <el-form
        ref="consumeFormRef"
        :model="consumeForm"
        :rules="consumeRules"
        label-width="90px"
      >
        <el-form-item
          label="消费金额"
          prop="amount"
        >
          <el-input-number
            v-model="consumeForm.amount"
            :min="0.01"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="消费说明"
          prop="description"
        >
          <el-input
            v-model="consumeForm.description"
            placeholder="如：私教课费用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="consumeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="submitting"
          @click="handleConsume"
        >
          确认消费
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/auth';

interface Member {
  id: number;
  name: string;
  phone: string;
}

interface Wallet {
  balance: number;
  points: number;
}

const auth = useAuthStore();
const isMember = auth.user?.role === 'member';

const loading = ref(false);
const submitting = ref(false);
const members = ref<Member[]>([]);
const transactions = ref<unknown[]>([]);
const wallet = ref<Wallet | null>(null);
const selectedMemberId = ref<number | undefined>(undefined);
const rechargeVisible = ref(false);
const consumeVisible = ref(false);
const rechargeFormRef = ref<FormInstance>();
const consumeFormRef = ref<FormInstance>();

const query = reactive({ type: '', range: null as string[] | null });
const rechargeForm = reactive({ amount: 100, payMethod: 'wechat' });
const consumeForm = reactive({ amount: 0, description: '' });

const rechargeRules: FormRules = {
  amount: [{ required: true, message: '请输入充值金额', trigger: 'change' }],
  payMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
};

const consumeRules: FormRules = {
  amount: [{ required: true, message: '请输入消费金额', trigger: 'change' }],
};

const currentMemberId = computed(() => (isMember ? auth.user?.id : selectedMemberId.value));

const memberName = computed(() => {
  if (isMember) {
    return auth.user?.name || '-';
  }
  return members.value.find((m) => m.id === selectedMemberId.value)?.name || '-';
});

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

function typeText(type: string): string {
  const map: Record<string, string> = { recharge: '充值', consume: '消费', refund: '退款' };
  return map[type] || type;
}

function typeTagType(type: string): 'success' | 'danger' | 'warning' | 'info' {
  const map: Record<string, 'success' | 'danger' | 'warning'> = { recharge: 'success', consume: 'danger', refund: 'warning' };
  return map[type] || 'info';
}

function payMethodText(method: string | undefined): string {
  const map: Record<string, string> = { cash: '现金', wechat: '微信', alipay: '支付宝', balance: '余额' };
  return method ? map[method] || method : '-';
}

async function fetchMembers(): Promise<void> {
  if (isMember) {
    return;
  }
  const data = await request.get('/members');
  members.value = data.list;
}

async function loadWallet(): Promise<void> {
  if (!currentMemberId.value) {
    return;
  }
  const data = await request.get(`/wallets/${currentMemberId.value}`);
  wallet.value = data;
  await fetchTransactions();
}

async function fetchTransactions(): Promise<void> {
  if (!currentMemberId.value) {
    return;
  }
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (query.type) {
      params.type = query.type;
    }
    if (query.range?.length === 2) {
      params.startDate = query.range[0];
      params.endDate = query.range[1];
    }
    const data = await request.get(`/wallets/${currentMemberId.value}/transactions`, { params });
    transactions.value = data.list;
  } finally {
    loading.value = false;
  }
}

function openRecharge(): void {
  rechargeForm.amount = 100;
  rechargeForm.payMethod = 'wechat';
  rechargeVisible.value = true;
}

async function handleRecharge(): Promise<void> {
  const valid = await rechargeFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  submitting.value = true;
  try {
    await request.post(`/wallets/${currentMemberId.value}/recharge`, rechargeForm);
    ElMessage.success('充值成功');
    rechargeVisible.value = false;
    await loadWallet();
  } finally {
    submitting.value = false;
  }
}

function openConsume(): void {
  consumeForm.amount = 0;
  consumeForm.description = '';
  consumeVisible.value = true;
}

async function handleConsume(): Promise<void> {
  const valid = await consumeFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  submitting.value = true;
  try {
    const data = await request.post(`/wallets/${currentMemberId.value}/pay`, consumeForm);
    ElMessage.success(`消费成功，获得 ${data.pointsEarned} 积分`);
    consumeVisible.value = false;
    await loadWallet();
  } finally {
    submitting.value = false;
  }
}

async function openRefund(row: { id: number }): Promise<void> {
  await request.post(`/wallets/${currentMemberId.value}/refund`, { transactionId: row.id });
  ElMessage.success('退款成功');
  await loadWallet();
}

onMounted(async () => {
  await fetchMembers();
  if (isMember) {
    selectedMemberId.value = auth.user?.id;
  } else if (members.value.length > 0) {
    selectedMemberId.value = members.value[0].id;
  }
  await loadWallet();
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.member-picker {
  margin-bottom: 16px;
}

.wallet-info {
  margin-bottom: 16px;
}

.amount {
  color: #e6a23c;
  font-weight: 600;
  font-size: 18px;
}

.amount-in {
  color: #67c23a;
}

.amount-out {
  color: #f56c6c;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
