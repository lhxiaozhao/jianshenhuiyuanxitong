<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>门店列表</span>
          <el-button
            v-if="isAdmin"
            type="primary"
            @click="openDialog()"
          >
            新增门店
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="stores"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="60"
        />
        <el-table-column
          prop="name"
          label="门店名称"
          min-width="140"
        />
        <el-table-column
          prop="address"
          label="地址"
          min-width="200"
        />
        <el-table-column
          prop="phone"
          label="电话"
          width="130"
        />
        <el-table-column
          prop="businessHours"
          label="营业时间"
          width="160"
        />
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.status === 1 ? 'success' : 'info'">
              {{ row.status === 1 ? '营业中' : '已停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          v-if="isAdmin"
          label="操作"
          width="180"
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
      :title="form.id ? '编辑门店' : '新增门店'"
      width="480px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item
          label="门店名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="请输入门店名称"
          />
        </el-form-item>
        <el-form-item
          label="地址"
          prop="address"
        >
          <el-input
            v-model="form.address"
            placeholder="请输入门店地址"
          />
        </el-form-item>
        <el-form-item
          label="电话"
          prop="phone"
        >
          <el-input
            v-model="form.phone"
            placeholder="请输入联系电话"
          />
        </el-form-item>
        <el-form-item
          label="营业时间"
          prop="businessHours"
        >
          <el-input
            v-model="form.businessHours"
            placeholder="如：09:00-22:00"
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
  address: string | null;
  phone: string | null;
  businessHours: string | null;
  status: number;
}

const auth = useAuthStore();
const isAdmin = auth.user?.role === 'admin';

const loading = ref(false);
const saving = ref(false);
const stores = ref<Store[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const form = reactive<Partial<Store>>({});
const rules: FormRules = {
  name: [{ required: true, message: '请输入门店名称', trigger: 'blur' }],
};

async function fetchStores(): Promise<void> {
  loading.value = true;
  try {
    const data = await request.get('/stores');
    stores.value = data.list;
  } finally {
    loading.value = false;
  }
}

function openDialog(row?: Store): void {
  Object.assign(form, row ? { ...row } : { name: '', address: '', phone: '', businessHours: '' });
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
      await request.put(`/stores/${form.id}`, form);
      ElMessage.success('修改成功');
    } else {
      await request.post('/stores', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    await fetchStores();
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(row: Store): Promise<void> {
  const next = row.status === 1 ? 0 : 1;
  await request.put(`/stores/${row.id}`, { status: next });
  ElMessage.success(next === 1 ? '门店已启用' : '门店已停用');
  await fetchStores();
}

onMounted(fetchStores);
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
