<template>
  <v-container class="py-4">
    <v-card>
      <v-card-title>
        <span class="text-h6">데이터셋 조회</span>
        <v-spacer />
        <v-select
          :items="datasets"
          item-title="name"
          item-value="id"
          label="데이터셋"
          v-model="selectedDatasetId"
          @update:modelValue="fetchDatasetDetail"
          dense
          style="max-width: 300px"
        />
      </v-card-title>

      <!-- CSV 데이터 타입 -->
      <v-data-table
        v-if="selectedDataset?.labels?.includes('csv') && records.length > 0"
        :headers="recordHeaders"
        :items="records"
        class="elevation-1"
      />

      <!-- 이미지 데이터 타입 -->
      <v-row
        v-else-if="selectedDataset?.labels?.includes('image') && imageFiles.length > 0"
        dense
      >
        <v-col
          v-for="file in imageFiles"
          :key="file.file_id"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card
            class="ma-2"
            outlined
          >
            <v-img
              v-if="file.file_id"
              :src="http.getDatasetImageUrl(selectedDatasetId, file.file_id)"
              aspect-ratio="1"
              class="bg-grey-lighten-2"
              cover
            />
            <v-card-title class="text-caption text-center">{{ file.filename }}</v-card-title>
          </v-card>
        </v-col>
      </v-row>

      <!-- 데이터셋 미선택 -->
      <v-card-text v-else>
        <p class="text-caption">데이터셋을 선택해주세요.</p>
      </v-card-text>
    </v-card>
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
const imageFiles = ref([]);

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

onMounted(() => {
  fetchDatasets();
});
</script>

<style>
.v-data-table-header__content {
  font-weight: bold !important;
  justify-content: center !important;
}
</style>
