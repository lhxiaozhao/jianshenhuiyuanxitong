<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <span>预约管理</span>
          <el-button
            type="primary"
            @click="openCreate"
          >
            新增预约
          </el-button>
        </div>
      </template>

      <div class="filter-bar">
        <el-select
          v-model="query.status"
          placeholder="预约状态"
          clearable
          style="width: 150px"
          @change="handleSearch"
        >
          <el-option
            label="已预约"
            value="booked"
          />
          <el-option
            label="候补"
            value="waiting"
          />
          <el-option
            label="已完成"
            value="completed"
          />
          <el-option
            label="已取消"
            value="cancelled"
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
        :data="bookings"
        stripe
      >
        <el-table-column
          prop="id"
          label="ID"
          width="70"
        />
        <el-table-column
          label="会员"
          min-width="140"
        >
          <template #default="{ row }">
            {{ row.member?.name }}（{{ row.member?.phone }}）
          </template>
        </el-table-column>
        <el-table-column
          label="课程"
          min-width="130"
        >
          <template #default="{ row }">
            {{ row.course?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="上课时间"
          min-width="170"
        >
          <template #default="{ row }">
            {{ formatTime(row.course?.startTime) }}
          </template>
        </el-table-column>
        <el-table-column
          label="教练"
          width="100"
        >
          <template #default="{ row }">
            {{ row.course?.trainer?.name || '-' }}
          </template>
        </el-table-column>
        <el-table-column
          label="状态"
          width="90"
        >
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)">
              {{ statusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column
          label="操作"
          width="160"
          fixed="right"
        >
          <template #default="{ row }">
            <template v-if="row.status === 'booked'">
              <el-button
                v-if="canConfirm"
                link
                type="success"
                @click="confirmBooking(row)"
              >
                消课
              </el-button>
              <el-button
                link
                type="danger"
                @click="cancelBooking(row)"
              >
                取消
              </el-button>
            </template>
            <template v-else-if="row.status === 'waiting'">
              <el-button
                link
                type="danger"
                @click="cancelBooking(row)"
              >
                取消
              </el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      v-model="createVisible"
      title="新增预约"
      width="520px"
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="90px"
      >
        <el-form-item
          v-if="!isMember"
          label="会员"
          prop="memberId"
        >
          <el-select
            v-model="createForm.memberId"
            filterable
            placeholder="输入姓名/手机号搜索"
            style="width: 100%"
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
          label="课程"
          prop="courseId"
        >
          <el-select
            v-model="createForm.courseId"
            placeholder="请选择课程"
            style="width: 100%"
          >
            <el-option
              v-for="course in openCourses"
              :key="course.id"
              :label="`${course.name} ${formatTime(course.startTime)} (${course.type === 'group' ? `${course.bookedCount}/${course.capacity}` : '私教'})`"
              :value="course.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">
          取消
        </el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="handleCreate"
        >
          确认预约
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

interface Course {
  id: number;
  name: string;
  type: 'group' | 'private';
  startTime: string;
  capacity: number | null;
  bookedCount: number;
  status: string;
}

const auth = useAuthStore();
const isMember = auth.user?.role === 'member';
const canConfirm = auth.user?.role === 'admin' || auth.user?.role === 'trainer';

const loading = ref(false);
const creating = ref(false);
const bookings = ref<unknown[]>([]);
const members = ref<Member[]>([]);
const courses = ref<Course[]>([]);
const createVisible = ref(false);
const createFormRef = ref<FormInstance>();

const query = reactive({ status: '' });
const createForm = reactive({ memberId: undefined as number | undefined, courseId: undefined as number | undefined });

const createRules: FormRules = {
  memberId: [{ required: true, message: '请选择会员', trigger: 'change' }],
  courseId: [{ required: true, message: '请选择课程', trigger: 'change' }],
};

const openCourses = computed(() => courses.value.filter((c) => c.status !== 'closed'));

function formatTime(value: string | undefined): string {
  return value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '-';
}

function statusText(status: string): string {
  const map: Record<string, string> = { booked: '已预约', waiting: '候补', completed: '已完成', cancelled: '已取消' };
  return map[status] || status;
}

function statusTagType(status: string): 'primary' | 'warning' | 'success' | 'info' {
  const map: Record<string, 'primary' | 'warning' | 'success' | 'info'> = { booked: 'primary', waiting: 'warning', completed: 'success', cancelled: 'info' };
  return map[status] || 'info';
}

async function fetchBookings(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string> = {};
    if (query.status) {
      params.status = query.status;
    }
    const data = await request.get('/bookings', { params });
    bookings.value = data.list;
  } finally {
    loading.value = false;
  }
}

async function fetchOptions(): Promise<void> {
  const [memberData, courseData] = await Promise.all([request.get('/members'), request.get('/courses')]);
  members.value = memberData.list;
  courses.value = courseData.list;
}

function handleSearch(): void {
  fetchBookings();
}

async function openCreate(): Promise<void> {
  Object.assign(createForm, { memberId: isMember ? auth.user?.id : undefined, courseId: undefined });
  if (members.value.length === 0 || courses.value.length === 0) {
    await fetchOptions();
  }
  createVisible.value = true;
}

async function handleCreate(): Promise<void> {
  const valid = await createFormRef.value?.validate().catch(() => false);
  if (!valid) {
    return;
  }
  creating.value = true;
  try {
    const body: Record<string, unknown> = { courseId: createForm.courseId };
    if (!isMember) {
      body.memberId = createForm.memberId;
    }
    const data = await request.post('/bookings', body);
    ElMessage.success(data.status === 'waiting' ? '名额已满，已加入候补' : '预约成功');
    createVisible.value = false;
    await fetchBookings();
  } finally {
    creating.value = false;
  }
}

async function cancelBooking(row: { id: number }): Promise<void> {
  await request.put(`/bookings/${row.id}/cancel`);
  ElMessage.success('已取消预约');
  await fetchBookings();
}

async function confirmBooking(row: { id: number }): Promise<void> {
  await request.put(`/bookings/${row.id}/confirm`);
  ElMessage.success('消课确认完成');
  await fetchBookings();
}

onMounted(fetchBookings);
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
