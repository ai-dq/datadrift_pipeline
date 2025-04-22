<template>
  <v-container class="bg-surface-variant">
    <v-row>
      <v-col>
        <span class="text-h6">데이터셋 조회</span>
      </v-col>
    </v-row>
    <v-spacer />
    <v-row>
      <v-col>
        <v-select
          :items="datasets"
          item-title="name"
          item-value="id"
          label="데이터셋"
          v-model="selectedDatasetId"
          @update:modelValue="fetchDatasetDetail"
        />
      </v-col>
      <v-col class="justify-center">
        <v-btn
          color="primary"
          @click="triggerFileInput"
          >파일 업로드</v-btn
        >
        <v-btn
          color="error"
          class="ml-2"
          @click="clearTemporaryFiles"
          >임시 파일 삭제</v-btn
        >
        <v-btn
          color="success"
          class="ml-2"
          @click="saveTemporaryFiles"
          >저장</v-btn
        >
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          @change="handleFileChange"
          style="display: none"
        />
      </v-col>
    </v-row>
    <!-- CSV 데이터 타입 -->
    <v-row v-if="selectedDataset?.labels?.includes('csv') && records.length > 0">
      <v-col cols="12">
        <v-data-table
          :headers="recordHeaders"
          :items="records"
          class="elevation-1"
        />
      </v-col>
    </v-row>

    <!-- 이미지 데이터 타입 -->
    <v-row
      v-else-if="selectedDataset?.labels?.includes('image') && imageFiles.length > 0"
      dense
    >
      <v-col
        v-for="file in imageFiles"
        :key="file.file_id || file.tempId"
        cols="12"
        sm="3"
        md="3"
        lg="2"
      >
        <v-card
          class="ma-2"
          outlined
        >
          <v-img
            :src="file.url"
            aspect-ratio="1"
            cover
            class="bg-grey-lighten-3"
            :style="{ opacity: file.isTemporary ? 0.5 : 1 }"
          />
          <v-card-title class="text-caption text-center">
            {{ file.filename }}
          </v-card-title>
        </v-card>
      </v-col>
    </v-row>

    <!-- 데이터셋 미선택 or 빈 상태 -->
    <v-row v-else>
      <v-col cols="12">
        <p class="text-caption">데이터셋을 선택해주세요.</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import http from "@/api/http";

const datasets = ref([]);
const loading = ref(false);
const selectedDatasetId = ref(null);
const selectedDataset = ref(null);
const records = ref([]);
const fileInputRef = ref(null);
const imageFiles = ref([]);
let tempIdCounter = 0;

const fetchDatasets = async () => {
  loading.value = true;
  try {
    const response = await http.getDatasets();
    datasets.value = response.data;

    if (datasets.value.length > 0) {
      selectedDatasetId.value = datasets.value[0].id;
      fetchDatasetDetail(datasets.value[0].id);
    }
  } catch (error) {
    console.error("데이터셋 목록 조회 실패:", error);
  } finally {
    loading.value = false;
  }
};

const fetchDatasetDetail = async (datasetId) => {
  imageFiles.value = [];
  try {
    const response = await http.getDatasetDetail(datasetId);
    records.value = response.data.sample_records || [];
    selectedDataset.value = response.data;

    if (response.data.labels.includes("image")) {
      fetchDatasetImageList(datasetId);
    }
  } catch (error) {
    console.error("데이터셋 상세 조회 실패:", error);
  }
};

const fetchDatasetImageList = async (datasetId) => {
  try {
    const response = await http.getDatasetImageList(datasetId);
    imageFiles.value = response.data;
  } catch (error) {
    console.error("이미지 리스트 로딩 실패:", error);
  }
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileChange = (e) => {
  const files = Array.from(e.target.files);
  const tempImages = files.map((file) => ({
    tempId: `temp-${tempIdCounter++}`,
    filename: file.name,
    file,
    isTemporary: true,
    url: URL.createObjectURL(file),
  }));
  imageFiles.value.push(...tempImages);
  e.target.value = "";
  console.log(imageFiles);
};

const clearTemporaryFiles = () => {
  imageFiles.value.filter((f) => f.isTemporary).forEach((f) => URL.revokeObjectURL(f.url));
  imageFiles.value = imageFiles.value.filter((f) => !f.isTemporary);
};

const saveTemporaryFiles = async () => {
  const tempFiles = imageFiles.value.filter((f) => f.isTemporary);
  const uploaded = [];

  for (const f of tempFiles) {
    const formData = new FormData();
    console.log("f", f.file);
    formData.append("file", f.file);
    try {
      const response = await http.uploadImageFile(selectedDatasetId.value, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      uploaded.push(response.data);
      URL.revokeObjectURL(f.url);
    } catch (err) {
      console.error("업로드 실패:", f.filename, err);
    }
  }

  imageFiles.value = imageFiles.value
    .filter((f) => !f.isTemporary)
    .concat(
      uploaded.map((f) => ({
        file_id: f.file_id,
        filename: f.filename,
        url: f.url,
        isTemporary: false,
      }))
    );
};

onMounted(() => {
  fetchDatasets();
});
</script>

<style>
.v-data-table-header__content {
  font-weight: bold !important;
  justify-content: center !important;
}

.v-input__control {
  max-height: 56px;
  overflow: auto;
}

.v-counter {
  color: var(--v-theme-on-surface) !important;
  font-size: 1.2em !important;
}
</style>
