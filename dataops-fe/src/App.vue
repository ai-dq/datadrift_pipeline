<template>
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
