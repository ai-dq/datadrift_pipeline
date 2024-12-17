<template>
    <img alt="Vue logo" src="./assets/logo.png">
    <MLTaskView></MLTaskView>
</template>

<script>
import MLTaskView from './views/MLTaskView.vue';

export default {
    name: 'App',
    components: {
        MLTaskView
    }
}
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
