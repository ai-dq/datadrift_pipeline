<template>
  <p>분석 모델의 성능저하 극복을 위한 데이터 드리프트 관리 기술 개발</p>
  <DatasetsView></DatasetsView>
</template>

<script>
import DatasetsView from "./views/DatasetsView.vue";

export default {
  name: "App",
  components: {
    DatasetsView,
  },
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
