<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>权益管理</span>
          <el-button
            v-if="isAdmin"
            type="primary"
            @click="openDialog()"
          >
            新增权益
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="benefits"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
        />
        <el-table-column
          prop="name"
          label="权益名称"
          min-width="160"
        />
        <el-table-column
          label="所需积分"
          width="110"
        >
          <template #default="{ row }">
            {{ row.pointsCost }} 积分
          </template>
        </el-table-column>
        <el-table-column
          label="类型"
          width="130"
        >
          <template #default="{ row }">
            <el-tag type="warning">
              {{ typeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '上架中' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="创建时间"
          min-width="170"
        >
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
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
      :title="form.id ? '编辑权益' : '新增权益'"
      width="440px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item
          label="权益名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="如：续卡优惠券"
          />
        </el-form-item>
        <el-form-item
          label="所需积分"
          prop="pointsCost"
        >
          <el-input-number
            v-model="form.pointsCost"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="权益类型"
          prop="type"
        >
          <el-select
            v-model="form.type"
            style="width: 100%"
          >
            <el-option
              label="续卡优惠券"
              value="coupon"
            />
            <el-option
              label="私教体验课"
              value="trial"
            />
            <el-option
              label="体能测试"
              value="test"
            />
          </el-select>
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

interface Benefit {
  id: number;
  name: string;
  pointsCost: number;
  type: string;
  status: number;
  createdAt: string;
}

const auth = useAuthStore();
const isAdmin = auth.user?.role === 'admin';

const loading = ref(false);
const saving = ref(false);
const benefits = ref<Benefit[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const form = reactive<Record<string, unknown>>({});
const rules: FormRules = {
  name: [{ required: true, message: '请输入权益名称', trigger: 'blur' }],
  pointsCost: [{ required: true, message: '请输入所需积分', trigger: 'change' }],
  type: [{ required: true, message: '请选择权益类型', trigger: 'change' }],
};

function typeText(type: string): string {
  const map: Record<string, string> = { coupon: '续卡优惠券', trial: '私教体验课', test: '体能测试' };
  return map[type] || type;
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function fetchBenefits(): Promise<void> {
  loading.value = true;
  try {
    const data = await request.get('/benefits', { params: { all: 1 } });
    benefits.value = data.list;
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: Benefit): void {
  Object.assign(form, row ? { ...row } : { name: '', pointsCost: 50, type: 'coupon' });
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
      await request.put(`/benefits/${form.id}`, form);
      ElMessage.success('修改成功');
    } else {
      await request.post('/benefits', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    await fetchBenefits();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: Benefit): Promise<void> {
  const next = row.status === 1 ? 0 : 1;
  await request.put(`/benefits/${row.id}/status`, { status: next });
  ElMessage.success(next === 1 ? '权益已上架' : '权益已下架');
  await fetchBenefits();
}

onMounted(fetchBenefits);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
