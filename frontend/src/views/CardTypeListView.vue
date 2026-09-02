<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>卡类型管理</span>
          <div>
            <el-button
              type="primary"
              plain
              @click="openMembershipQuery"
            >
              查看会籍
            </el-button>
            <el-button
              type="primary"
              plain
              @click="openPurchase"
            >
              会员购卡
            </el-button>
            <el-button
              v-if="isAdmin"
              type="primary"
              @click="openDialog()"
            >
              新增卡类型
            </el-button>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="cardTypes"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="60"
        />
        <el-table-column
          prop="name"
          label="卡名称"
          min-width="120"
        />
        <el-table-column
          label="时长"
          width="100"
        >
          <template #default="{ row }">
            {{ row.durationDays }} 天
          </template>
        </el-table-column>
        <el-table-column
          label="价格"
          width="110"
        >
          <template #default="{ row }">
            ￥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column
          label="适用门店"
          width="110"
        >
          <template #default="{ row }">
            {{ row.storeId ? storeName(row.storeId) : '全部门店' }}
          </template>
        </el-table-column>
        <el-table-column
          prop="benefitsDesc"
          label="权益说明"
          min-width="180"
          show-overflow-tooltip
        />
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '在售' : '下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          v-if="isAdmin"
          label="操作"
          width="160"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="openDialog(row)"
            >
              编辑
            </el-button>
            <el-button
              link
              :type="row.status === 1 ? 'danger' : 'success'"
              @click="toggleStatus(row)"
            >
              {{ row.status === 1 ? '下架' : '上架' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑卡类型' : '新增卡类型'"
      width="500px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item
          label="卡名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="如：月卡 / 年卡"
          />
        </el-form-item>
        <el-form-item
          label="时长(天)"
          prop="durationDays"
        >
          <el-input-number
            v-model="form.durationDays"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="价格(元)"
          prop="price"
        >
          <el-input-number
            v-model="form.price"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="适用门店"
          prop="storeId"
        >
          <el-select
            v-model="form.storeId"
            placeholder="不选则适用全部门店"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="store in stores"
              :key="store.id"
              :label="store.name"
              :value="store.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="权益说明"
          prop="benefitsDesc"
        >
          <el-input
            v-model="form.benefitsDesc"
            type="textarea"
            :rows="3"
            placeholder="卡包含的权益描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="saving"
          @click="handleSave"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="purchaseVisible"
      title="会员购卡"
      width="520px"
    >
      <el-form
        ref="purchaseFormRef"
        :model="purchaseForm"
        :rules="purchaseRules"
        label-width="90px"
      >
        <el-form-item
          label="会员"
          prop="memberId"
        >
          <el-select
            v-model="purchaseForm.memberId"
            filterable
            placeholder="输入姓名/手机号搜索"
            style="width: 100%"
            @change="handleMemberChange"
          >
            <el-option
              v-for="member in members"
              :key="member.id"
              :label="`${member.name} (${member.phone})`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="卡类型"
          prop="cardTypeId"
        >
          <el-select
            v-model="purchaseForm.cardTypeId"
            placeholder="请选择卡类型"
            style="width: 100%"
          >
            <el-option
              v-for="card in purchaseCardTypes"
              :key="card.id"
              :label="`${card.name} (${card.durationDays}天/￥${card.price})`"
              :value="card.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          label="支付方式"
          prop="payMethod"
        >
          <el-radio-group v-model="purchaseForm.payMethod">
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
        <el-button @click="purchaseVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="purchasing"
          @click="handlePurchase"
        >
          确认购卡
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="membershipVisible"
      :title="`会员会籍：${selectedMember?.name ?? ''}`"
      width="640px"
    >
      <el-form label-width="90px">
        <el-form-item label="选择会员">
          <el-select
            v-model="membershipQueryMemberId"
            filterable
            placeholder="输入姓名/手机号搜索"
            style="width: 100%"
            @change="viewMemberships"
          >
            <el-option
              v-for="member in members"
              :key="member.id"
              :label="`${member.name} (${member.phone})`"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <el-table
        v-loading="membershipLoading"
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
          width="110"
        />
        <el-table-column
          prop="endDate"
          label="结束日期"
          width="110"
        />
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/auth';

interface Store {
  id: number;
  name: string;
}

interface CardType {
  id: number;
  name: string;
  durationDays: number;
  price: string | number;
  storeId: number | null;
  status: number;
  benefitsDesc: string | null;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  storeId: number;
}

const auth = useAuthStore();
const isAdmin = auth.user?.role === 'admin';

const loading = ref(false);
const saving = ref(false);
const purchasing = ref(false);
const membershipLoading = ref(false);
const cardTypes = ref<CardType[]>([]);
const stores = ref<Store[]>([]);
const members = ref<Member[]>([]);
const memberships = ref<unknown[]>([]);
const dialogVisible = ref(false);
const purchaseVisible = ref(false);
const membershipVisible = ref(false);
const membershipQueryMemberId = ref<number | undefined>(undefined);
const formRef = ref<FormInstance>();
const purchaseFormRef = ref<FormInstance>();
const selectedMember = ref<Member | null>(null);

const form = reactive<Record<string, unknown>>({});
const purchaseForm = reactive({ memberId: undefined as number | undefined, cardTypeId: undefined as number | undefined, payMethod: 'cash' });

const rules: FormRules = {
  name: [{ required: true, message: '请输入卡名称', trigger: 'blur' }],
  durationDays: [{ required: true, message: '请输入时长', trigger: 'change' }],
  price: [{ required: true, message: '请输入价格', trigger: 'change' }],
};

const purchaseRules: FormRules = {
  memberId: [{ required: true, message: '请选择会员', trigger: 'change' }],
  cardTypeId: [{ required: true, message: '请选择卡类型', trigger: 'change' }],
};

const purchaseCardTypes = computed(() => cardTypes.value.filter((c) => c.status === 1));

function storeName(storeId: number): string {
  return stores.value.find((s) => s.id === storeId)?.name || `#${storeId}`;
}

function statusText(status: string): string {
  const map: Record<string, string> = { active: '生效中', expired: '已过期', frozen: '已冻结' };
  return map[status] || status;
}

async function fetchCardTypes(): Promise<void> {
  loading.value = true;
  try {
    const data = await request.get('/card-types');
    cardTypes.value = data.list;
  } finally {
    loading.value = false;
  }
}

async function fetchStores(): Promise<void> {
  const data = await request.get('/stores');
  stores.value = data.list;
}

async function fetchMembers(): Promise<void> {
  const data = await request.get('/members', { params: { page: 1, pageSize: 100 } });
  members.value = data.list;
}

function openDialog(row?: CardType): void {
  Object.assign(form, row ? { ...row } : { name: '', durationDays: 30, price: 0, storeId: null, benefitsDesc: '' });
  dialogVisible.value = true;
}

async function handleSave(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  saving.value = true;
  try {
    if (form.id) {
      await request.put(`/card-types/${form.id}`, form);
      ElMessage.success('修改成功');
    } else {
      await request.post('/card-types', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    await fetchCardTypes();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: CardType): Promise<void> {
  const next = row.status === 1 ? 0 : 1;
  await request.put(`/card-types/${row.id}/status`, { status: next });
  ElMessage.success(next === 1 ? '卡类型已上架' : '卡类型已下架');
  await fetchCardTypes();
}

function openPurchase(): void {
  Object.assign(purchaseForm, { memberId: undefined, cardTypeId: undefined, payMethod: 'cash' });
  selectedMember.value = null;
  purchaseVisible.value = true;
}

function handleMemberChange(memberId: number): void {
  selectedMember.value = members.value.find((m) => m.id === memberId) ?? null;
  purchaseForm.cardTypeId = undefined;
}

async function handlePurchase(): Promise<void> {
  const valid = await purchaseFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  purchasing.value = true;
  try {
    await request.post(`/members/${purchaseForm.memberId}/cards`, purchaseForm);
    ElMessage.success('购卡成功');
    purchaseVisible.value = false;
  } finally {
    purchasing.value = false;
  }
}

function openMembershipQuery(): void {
  membershipQueryMemberId.value = undefined;
  memberships.value = [];
  selectedMember.value = null;
  membershipVisible.value = true;
}

async function viewMemberships(memberId: number): Promise<void> {
  selectedMember.value = members.value.find((m) => m.id === memberId) ?? null;
  membershipLoading.value = true;
  try {
    const data = await request.get(`/members/${memberId}/memberships`);
    memberships.value = data.list;
  } finally {
    membershipLoading.value = false;
  }
}

onMounted(async () => {
  await Promise.all([fetchCardTypes(), fetchStores(), fetchMembers()]);
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
