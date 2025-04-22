import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:9466",
  // baseURL: "/",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

function getDatasets(params) {
  return api.get(`/datasets`, { params });
}

function getDatasetDetail(datasetId) {
  return api.get(`/datasets/${datasetId}`);
}

function getDatasetImageList(datasetId) {
  return api.get(`/datasets/${datasetId}/images`);
}

function getDatasetImageUrl(datasetId, imageId) {
  return `${api.defaults.baseURL}/datasets/${datasetId}/images/${imageId}`;
}

export default {
  getDatasets,
  getDatasetDetail,
  getDatasetImageList,
  getDatasetImageUrl,
};
