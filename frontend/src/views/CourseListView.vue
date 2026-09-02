<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>课程列表</span>
          <el-button
            v-if="canManage"
            type="primary"
            @click="openDialog()"
          >
            创建课程
          </el-button>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="courses"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="60"
        />
        <el-table-column
          prop="name"
          label="课程名称"
          min-width="140"
        />
        <el-table-column
          label="类型"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="row.type === 'group' ? 'primary' : 'warning'">
              {{ row.type === 'group' ? '团体课' : '私教课' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="教练"
          width="100"
        >
          <template #default="{ row }">
            {{ row.trainer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="上课时间"
          min-width="170"
        >
          <template #default="{ row }">
            {{ formatTime(row.startTime) }}
          </template>
        </el-table-column>
        <el-table-column
          prop="durationMinutes"
          label="时长"
          width="90"
        >
          <template #default="{ row }">
            {{ row.durationMinutes }} 分钟
          </template>
        </el-table-column>
        <el-table-column
          label="名额"
          width="110"
        >
          <template #default="{ row }">
            <template v-if="row.type === 'group'">
              {{ row.bookedCount }}/{{ row.capacity }}
              <el-tag
                v-if="row.remaining === 0"
                type="danger"
                size="small"
              >
                已满
              </el-tag>
            </template>
            <template v-else>
              -
            </template>
          </template>
        </el-table-column>
        <el-table-column
          v-if="canManage"
          label="操作"
          width="150"
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
              v-if="row.status !== 'closed'"
              link
              type="danger"
              @click="toggleClose(row)"
            >
              关闭
            </el-button>
            <el-button
              v-else
              link
              type="success"
              @click="toggleClose(row)"
            >
              开启
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="form.id ? '编辑课程' : '创建课程'"
      width="520px"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="90px"
      >
        <el-form-item
          label="课程名称"
          prop="name"
        >
          <el-input
            v-model="form.name"
            placeholder="如：动感单车 / 一对一私教"
          />
        </el-form-item>
        <el-form-item
          label="课程类型"
          prop="type"
        >
          <el-radio-group v-model="form.type">
            <el-radio value="group">
              团体课
            </el-radio>
            <el-radio value="private">
              私教课
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="教练"
          prop="trainerId"
        >
          <el-select
            v-model="form.trainerId"
            placeholder="请选择教练"
            style="width: 100%"
          >
            <el-option
              v-for="trainer in trainers"
              :key="trainer.id"
              :label="trainer.name"
              :value="trainer.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="isAdmin"
          label="所属门店"
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
          label="上课时间"
          prop="startTime"
        >
          <el-date-picker
            v-model="form.startTime"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="请选择上课时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          label="时长(分钟)"
          prop="durationMinutes"
        >
          <el-input-number
            v-model="form.durationMinutes"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          v-if="form.type === 'group'"
          label="人数上限"
          prop="capacity"
        >
          <el-input-number
            v-model="form.capacity"
            :min="1"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item
          v-if="form.type === 'private'"
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

interface Trainer {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
  type: 'group' | 'private';
  trainer: { id: number; name: string } | null;
  startTime: string;
  durationMinutes: number;
  capacity: number | null;
  price: string | number | null;
  status: string;
  bookedCount: number;
  remaining: number;
}

const auth = useAuthStore();
const isAdmin = auth.user?.role === 'admin';
const canManage = isAdmin || auth.user?.role === 'trainer';

const loading = ref(false);
const saving = ref(false);
const courses = ref<Course[]>([]);
const stores = ref<Store[]>([]);
const trainers = ref<Trainer[]>([]);
const dialogVisible = ref(false);
const formRef = ref<FormInstance>();

const form = reactive<Record<string, unknown>>({});
const rules: FormRules = {
  name: [{ required: true, message: '请输入课程名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择课程类型', trigger: 'change' }],
  trainerId: [{ required: true, message: '请选择教练', trigger: 'change' }],
  startTime: [{ required: true, message: '请选择上课时间', trigger: 'change' }],
  durationMinutes: [{ required: true, message: '请输入时长', trigger: 'change' }],
};

function formatTime(value: string): string {
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

async function fetchCourses(): Promise<void> {
  loading.value = true;
  try {
    const data = await request.get('/courses');
    courses.value = data.list;
  } finally {
    loading.value = false;
  }
}

async function fetchOptions(): Promise<void> {
  const [storeData, trainerData] = await Promise.all([request.get('/stores'), request.get('/users/trainers')]);
  stores.value = storeData.list;
  trainers.value = trainerData.list;
}

function openDialog(row?: Course): void {
  Object.assign(
    form,
    row
      ? { ...row, trainerId: row.trainer?.id }
      : { name: '', type: 'group', trainerId: undefined, storeId: stores.value[0]?.id, startTime: '', durationMinutes: 60, capacity: 10, price: 0 }
  );
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
      await request.put(`/courses/${form.id}`, form);
      ElMessage.success('修改成功');
    } else {
      await request.post('/courses', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    await fetchCourses();
  } finally {
    saving.value = false;
  }
}

async function toggleClose(row: Course): Promise<void> {
  const next = row.status === 'closed' ? 'open' : 'closed';
  await request.put(`/courses/${row.id}`, { status: next });
  ElMessage.success(next === 'closed' ? '课程已关闭' : '课程已开启');
  await fetchCourses();
}

onMounted(async () => {
  await fetchOptions();
  await fetchCourses();
});
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
