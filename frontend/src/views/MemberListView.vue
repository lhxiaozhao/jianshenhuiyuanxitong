<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>会员列表</span>
          <el-button
            type="primary"
            @click="openDialog()"
          >
            注册会员
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-input
          v-model="query.keyword"
          placeholder="姓名 / 手机号 / 会员号"
          clearable
          style="width: 240px"
          @keyup.enter="handleSearch"
          @clear="handleSearch"
        />
        <el-select
          v-model="query.status"
          placeholder="状态"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <el-option
            label="正常"
            :value="1"
          />
          <el-option
            label="停用"
            :value="0"
          />
        </el-select>
        <el-button
          type="primary"
          @click="handleSearch"
        >
          查询
        </el-button>
      </div>

      <el-table
        v-loading="loading"
        :data="members"
        stripe
      >
        <el-table-column
          prop="memberNo"
          label="会员号"
          width="150"
        />
        <el-table-column
          prop="name"
          label="姓名"
          width="100"
        />
        <el-table-column
          prop="phone"
          label="手机号"
          width="130"
        />
        <el-table-column
          label="性别"
          width="70"
        >
          <template #default="{ row }">
            {{ genderText(row.gender) }}
          </template>
        </el-table-column>
        <el-table-column
          label="所属门店"
          min-width="120"
        >
          <template #default="{ row }">
            {{ storeName(row.storeId) }}
          </template>
        </el-table-column>
        <el-table-column
          label="钱包余额"
          width="100"
        >
          <template #default="{ row }">
            ￥{{ row.wallet ? row.wallet.balance : 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="积分"
          width="80"
        >
          <template #default="{ row }">
            {{ row.pointsAccount ? row.pointsAccount.balance : 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="会籍"
          width="80"
        >
          <template #default="{ row }">
            {{ row.memberships ? row.memberships.length : 0 }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '正常' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="170"
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
              {{ row.status === 1 ? '停用' : '启用' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑会员' : '注册会员'"
      width="520px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="100px"
      >
        <el-form-item
          label="姓名"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
          />
        </el-form-item>
        <el-form-item
          v-if="!form.id"
          label="手机号"
          prop="phone"
        >
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
          />
        </el-form-item>
        <el-form-item
          v-if="!form.id && isAdmin"
          label="归属门店"
          prop="storeId"
        >
          <el-select
            v-model="form.storeId"
            placeholder="请选择门店"
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
          label="性别"
          prop="gender"
        >
          <el-radio-group v-model="form.gender">
            <el-radio :value="1">
              男
            </el-radio>
            <el-radio :value="2">
              女
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="生日"
          prop="birthday"
        >
          <el-date-picker
            v-model="form.birthday"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="请选择生日"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="身份证号"
          prop="idCard"
        >
          <el-input
            v-model="form.idCard"
            placeholder="请输入身份证号"
          />
        </el-form-item>
        <el-form-item
          label="紧急联系人"
          prop="emergencyContact"
        >
          <el-input
            v-model="form.emergencyContact"
            placeholder="请输入紧急联系人"
          />
        </el-form-item>
        <el-form-item
          label="紧急电话"
          prop="emergencyPhone"
        >
          <el-input
            v-model="form.emergencyPhone"
            placeholder="请输入紧急联系电话"
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
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import request from '@/utils/request';
import { useAuthStore } from '@/stores/auth';

interface Store {
  id: number;
  name: string;
}

interface Member {
  id: number;
  memberNo: string;
  name: string;
  phone: string;
  gender: number | null;
  storeId: number;
  status: number;
  wallet: { balance: number } | null;
  pointsAccount: { balance: number } | null;
  memberships: unknown[];
}

const auth = useAuthStore();
const isAdmin = auth.user?.role === 'admin';

const loading = ref(false);
const saving = ref(false);
const members = ref<Member[]>([]);
const stores = ref<Store[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const query = reactive({ keyword: '', status: '' });
const form = reactive<Record<string, unknown>>({});

const rules: FormRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' },
  ],
  storeId: [{ required: true, message: '请选择归属门店', trigger: 'change' }],
};

function genderText(gender: number | null): string {
  if (gender === 1) {
    return '男';
  }
  if (gender === 2) {
    return '女';
  }
  return '-';
}

function storeName(storeId: number): string {
  return stores.value.find((s) => s.id === storeId)?.name || `#${storeId}`;
}

async function fetchMembers(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (query.keyword) {
      params.keyword = query.keyword;
    }
    if (query.status !== '') {
      params.status = String(query.status);
    }
    const data = await request.get('/members', { params });
    members.value = data.list;
  } finally {
    loading.value = false;
  }
}

async function fetchStores(): Promise<void> {
  const data = await request.get('/stores');
  stores.value = data.list;
}

function handleSearch(): void {
  fetchMembers();
}

function openDialog(row?: Member): void {
  Object.assign(form, row ? { ...row } : { name: '', phone: '', gender: 1, birthday: '', idCard: '', emergencyContact: '', emergencyPhone: '', storeId: stores.value.length ? stores.value[0].id : undefined });
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
      await request.put(`/members/${form.id}`, form);
      ElMessage.success('修改成功');
    } else {
      await request.post('/members', form);
      ElMessage.success('注册成功');
    }
    dialogVisible.value = false;
    await fetchMembers();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: Member): Promise<void> {
  const next = row.status === 1 ? 0 : 1;
  await request.put(`/members/${row.id}/status`, { status: next });
  ElMessage.success(next === 1 ? '会员已启用' : '会员已停用');
  await fetchMembers();
}

onMounted(async () => {
  await fetchStores();
  await fetchMembers();
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
