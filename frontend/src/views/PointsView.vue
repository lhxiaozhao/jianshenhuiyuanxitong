<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>积分明细</span>
          <div>
            <el-button
              type="primary"
              plain
              @click="openExchange"
            >
              积分兑换
            </el-button>
            <el-button
              v-if="isAdmin"
              plain
              @click="openRules"
            >
              积分规则
            </el-button>
            <el-button
              v-if="isAdmin"
              plain
              @click="runExpire"
            >
              过期处理
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
          @change="loadPoints"
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
        v-if="account"
        :column="3"
        border
        class="points-info"
      >
        <el-descriptions-item label="会员">
          {{ memberName }}
        </el-descriptions-item>
        <el-descriptions-item label="积分余额">
          <span class="balance">{{ account.balance }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="积分规则">
          1元={{ rules.pointsPerYuan }}积分，有效期{{ rules.pointsValidDays }}天
        </el-descriptions-item>
      </el-descriptions>

      <el-tabs v-model="activeTab">
        <el-tab-pane
          label="积分明细"
          name="records"
        >
          <el-table
            v-loading="loading"
            :data="account?.records"
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
                <el-tag :type="row.points >= 0 ? 'success' : 'danger'">
                  {{ recordTypeText(row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              label="变动"
              width="100"
            >
              <template #default="{ row }">
                <span :class="row.points >= 0 ? 'amount-in' : 'amount-out'">
                  {{ row.points >= 0 ? '+' : '' }}{{ row.points }}
                </span>
              </template>
            </el-table-column>
            <el-table-column
              label="关联订单"
              width="110"
            >
              <template #default="{ row }">
                {{ row.orderId || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              label="过期时间"
              width="170"
            >
              <template #default="{ row }">
                {{ row.expireAt ? formatTime(row.expireAt) : '-' }}
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
          </el-table>
        </el-tab-pane>
        <el-tab-pane
          label="兑换历史"
          name="exchanges"
        >
          <el-table
            :data="account?.exchanges"
            stripe
          >
            <el-table-column
              prop="id"
              label="ID"
              width="70"
            />
            <el-table-column
              label="权益项目"
              min-width="140"
            >
              <template #default="{ row }">
                {{ row.benefit?.name || `#${row.benefitId}` }}
              </template>
            </el-table-column>
            <el-table-column
              prop="pointsCost"
              label="消耗积分"
              width="100"
            />
            <el-table-column
              label="状态"
              width="90"
            >
              <template #default="{ row }">
                <el-tag :type="row.status === 'completed' ? 'primary' : 'success'">
                  {{ row.status === 'completed' ? '待使用' : '已使用' }}
                </el-tag>
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
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog
      v-model="exchangeVisible"
      title="积分兑换"
      width="480px"
    >
      <div
        v-if="benefits.length === 0"
        class="empty-tip"
      >
        暂无可兑换的权益项目
      </div>
      <el-form
        v-else
        ref="exchangeFormRef"
        :model="exchangeForm"
        :rules="exchangeRules"
        label-width="90px"
      >
        <el-form-item
          label="权益项目"
          prop="benefitId"
        >
          <el-radio-group
            v-model="exchangeForm.benefitId"
            class="benefit-radio"
          >
            <el-radio
              v-for="benefit in benefits"
              :key="benefit.id"
              :value="benefit.id"
              class="benefit-item"
            >
              <div class="benefit-name">
                {{ benefit.name }}
              </div>
              <div class="benefit-cost">
                {{ benefit.pointsCost }} 积分
              </div>
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="exchangeVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="exchanging"
          @click="handleExchange"
        >
          确认兑换
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="rulesVisible"
      title="积分规则配置"
      width="420px"
    >
      <el-form
        ref="rulesFormRef"
        :model="rulesForm"
        :rules="rulesFormRules"
        label-width="110px"
      >
        <el-form-item
          label="1元=积分"
          prop="pointsPerYuan"
        >
          <el-input-number
            v-model="rulesForm.pointsPerYuan"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="有效期(天)"
          prop="pointsValidDays"
        >
          <el-input-number
            v-model="rulesForm.pointsValidDays"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rulesVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="savingRules"
          @click="handleSaveRules"
        >
          保存
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

interface Benefit {
  id: number;
  name: string;
  pointsCost: number;
}

interface PointsRules {
  pointsPerYuan: number;
  pointsValidDays: number;
}

interface PointsAccount {
  balance: number;
  records: unknown[];
  exchanges: unknown[];
}

const auth = useAuthStore();
const isMember = auth.user?.role === 'member';
const isAdmin = auth.user?.role === 'admin';

const loading = ref(false);
const exchanging = ref(false);
const savingRules = ref(false);
const members = ref<Member[]>([]);
const benefits = ref<Benefit[]>([]);
const account = ref<PointsAccount | null>(null);
const rules = ref<PointsRules>({ pointsPerYuan: 1, pointsValidDays: 365 });
const selectedMemberId = ref<number | undefined>(undefined);
const activeTab = ref('records');
const exchangeVisible = ref(false);
const rulesVisible = ref(false);
const exchangeFormRef = ref<FormInstance>();
const rulesFormRef = ref<FormInstance>();

const exchangeForm = reactive({ benefitId: undefined as number | undefined });
const rulesForm = reactive({ pointsPerYuan: 1, pointsValidDays: 365 });

const exchangeRules: FormRules = {
  benefitId: [{ required: true, message: '请选择权益项目', trigger: 'change' }],
};

const rulesFormRules: FormRules = {
  pointsPerYuan: [{ required: true, message: '请输入积分规则', trigger: 'change' }],
  pointsValidDays: [{ required: true, message: '请输入有效期', trigger: 'change' }],
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

function recordTypeText(type: string): string {
  const map: Record<string, string> = { earn: '获取', spend: '消耗', expire: '过期' };
  return map[type] || type;
}

async function fetchMembers(): Promise<void> {
  if (isMember) {
    return;
  }
  const data = await request.get('/members');
  members.value = data.list;
}

async function loadPoints(): Promise<void> {
  if (!currentMemberId.value) {
    return;
  }
  loading.value = true;
  try {
    const data = await request.get(`/points/${currentMemberId.value}`);
    account.value = data;
  } finally {
    loading.value = false;
  }
}

async function loadRules(): Promise<void> {
  const data = await request.get('/points/rules');
  rules.value = data;
  Object.assign(rulesForm, data);
}

async function loadBenefits(): Promise<void> {
  const data = await request.get('/benefits');
  benefits.value = data.list;
}

async function openExchange(): Promise<void> {
  exchangeForm.benefitId = undefined;
  if (benefits.value.length === 0) {
    await loadBenefits();
  }
  exchangeVisible.value = true;
}

async function handleExchange(): Promise<void> {
  const valid = await exchangeFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  exchanging.value = true;
  try {
    const data = await request.post(`/points/${currentMemberId.value}/exchange`, exchangeForm);
    ElMessage.success(`兑换成功，剩余积分 ${data.balance}`);
    exchangeVisible.value = false;
    await loadPoints();
  } finally {
    exchanging.value = false;
  }
}

function openRules(): void {
  rulesVisible.value = true;
}

async function handleSaveRules(): Promise<void> {
  const valid = await rulesFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  savingRules.value = true;
  try {
    const data = await request.put('/points/rules', rulesForm);
    rules.value = data;
    ElMessage.success('积分规则已更新');
    rulesVisible.value = false;
  } finally {
    savingRules.value = false;
  }
}

async function runExpire(): Promise<void> {
  const data = await request.post('/points/expire-run');
  ElMessage.success(data.expired > 0 ? `已处理过期积分 ${data.expired}` : '暂无可过期的积分');
  await loadPoints();
}

onMounted(async () => {
  await Promise.all([fetchMembers(), loadRules()]);
  if (isMember) {
    selectedMemberId.value = auth.user?.id;
  } else if (members.value.length > 0) {
    selectedMemberId.value = members.value[0].id;
  }
  await loadPoints();
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

.points-info {
  margin-bottom: 16px;
}

.balance {
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

.empty-tip {
  text-align: center;
  color: #909399;
  padding: 24px 0;
}

.benefit-radio {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
}

.benefit-item {
  display: flex;
  align-items: center;
  width: 100%;
  height: 48px;
}

.benefit-name {
  font-size: 14px;
}

.benefit-cost {
  margin-left: 12px;
  color: #e6a23c;
  font-weight: 600;
}
</style>
