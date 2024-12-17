<template>
    <v-container fluid>
        <v-card>
            <v-card-title>TEXT DEEP TAGGING</v-card-title>
            <v-container fluid>
                <v-expansion-panels>
                    <v-expansion-panel v-for="(text, i) in models.texts" :key="i">
                        <v-expansion-panel-header>
                            <strong>{{ text.name }}</strong>
                        </v-expansion-panel-header>
                        <v-expansion-panel-content>
                            <v-simple-table dense>
                                <template v-slot:default>
                                    <thead>
                                        <tr>
                                            <th class="text-left">
                                                Algorithm
                                            </th>
                                            <th class="text-left">
                                                Image name
                                            </th>
                                            <th class="text-left">
                                                Training parameters
                                            </th>
                                            <th class="text-left">
                                                Performance Metrics
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(algorithm, index) in text.algorithms" :key="index">
                                            <td>{{ algorithm.name }}</td>
                                            <td>{{ algorithm.image_name }}</td>
                                            <td>
                                                <div v-for="(param, index) in algorithm.training_params" :key="index">
                                                    {{ param.name }} Type: {{ param.type }} default: {{ param.default }}
                                                </div>
                                            </td>
                                            <td>
                                                <div v-for="(metric, index) in algorithm.performance_metrics"
                                                    :key="index">
                                                    {{ metric.name }} Type: {{ metric.type }}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </template>
                            </v-simple-table>
                        </v-expansion-panel-content>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-container>
        </v-card>

        <v-card class="mt-5">
            <v-card-title>IMAGE DEEP TAGGING</v-card-title>
            <v-container fluid>
                <v-expansion-panels>
                    <v-expansion-panel v-for="(image, i) in models.images" :key="i">
                        <v-expansion-panel-header>
                            <b>{{ image.name }}</b>
                        </v-expansion-panel-header>
                        <v-expansion-panel-content>
                            <v-simple-table dense>
                                <template v-slot:default>
                                    <thead>
                                        <tr>
                                            <th class="text-left">
                                                Algorithm
                                            </th>
                                            <th class="text-left">
                                                Image name
                                            </th>
                                            <th class="text-left">
                                                Training parameters
                                            </th>
                                            <th class="text-left">
                                                Performance Metrics
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="(algorithm, index) in image.algorithms" :key="index">
                                            <td>{{ algorithm.name }}</td>
                                            <td>{{ algorithm.image_name }}</td>
                                            <td>
                                                <div v-for="(param, index) in algorithm.training_params" :key="index">
                                                    {{ param.name }} Type: {{ param.type }} default: {{ param.default }}
                                                </div>
                                            </td>
                                            <td>
                                                <div v-for="(metric, index) in algorithm.performance_metrics"
                                                    :key="index">
                                                    {{ metric.name }} Type: {{ metric.type }}
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </template>
                            </v-simple-table>
                        </v-expansion-panel-content>
                    </v-expansion-panel>
                </v-expansion-panels>
            </v-container>
        </v-card>
    </v-container>
</template>

<script>
export default {
    data: () => ({
        models: {
            texts: [],
            images: [],
        }
    }),
    created() {
        this.fetchModels();
    },
    methods: {
        fetchModels() {
            // 모델 정보 가져오기
        }
    }
}
</script>