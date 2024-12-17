<template>
    <v-card>
        <v-row>
            <v-col class="pa-7 pb-0" cols="2">
                <v-select class="float-left" outlined clearable label="ML Task" :items="selectItems"
                    v-model="filter.selected.ml_task" @change="getDataset"></v-select>
            </v-col>
            <v-col class="pa-7 pb-0">
                <v-btn large color="primary" class="float-right" @click="openDialog">CREATE</v-btn>
            </v-col>
        </v-row>
        <v-row class="ma-7">
            <v-col class="pa-5" v-for="(dataset, index) in datasets" :key="index" cols="12" md="6">
                <v-card hover :to="{ name: 'DatasetDetailView', params: { dataset_id: dataset._id } }">
                    <div>
                        <v-card-text class="pb-0">
                            {{ getMLTaskName(dataset.ml_task) }}
                        </v-card-text>
                        <div class="d-flex">
                            <v-avatar class="ma-3" size="192" tile>
                                <v-img :src="getCoverImage(dataset.cover_image)" contain />
                            </v-avatar>
                            <div class="pa-0 ma-0">
                                <v-footer color="white" padless style="height:100%;">
                                    <v-card-title class="pt-0">
                                        {{ dataset.name }}
                                    </v-card-title>
                                    <v-card-text>
                                        {{ dataset.description }}
                                    </v-card-text>
                                    <v-card-subtitle class="grey--text">
                                        {{ dataset.labeled_data }} / {{ dataset.total_data }}
                                    </v-card-subtitle>
                                </v-footer>
                            </div>
                        </div>
                    </div>
                </v-card>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="11">
                <v-pagination v-model="pagenation.page" :length="pagenation.length" :total-visible="10"
                    @input="pageMove"></v-pagination>
            </v-col>
            <v-col cols="1" class="pr-10">
                <v-select v-model="filter.selected.limit" :items="[10, 20, 50]" dense outlined hint="per page"
                    persistent-hint @change="getDataset"></v-select>
            </v-col>
        </v-row>
        <v-dialog persistent width="500" v-model="datasetDialog.show">
            <v-card>
                <v-card-title>Create Dataset</v-card-title>
                <v-card-text>
                    <v-form ref="form" v-model="createDto.valid" lazy-validation>
                        <v-row>
                            <v-col cols="3">
                                <v-card-subtitle class="pa-2 pl-0">ML Task<v-icon x-small
                                        color="red">mdi-asterisk</v-icon> :</v-card-subtitle>
                            </v-col>
                            <v-col cols="9">
                                <v-select class="float-left" outlined required clearable dense label="ML Task"
                                    :items="selectItems" :rules="[v => (typeof v) === 'number' || 'Item is required']"
                                    v-model="createDto.ml_task"></v-select>
                            </v-col>
                            <v-col cols="3">
                                <v-card-subtitle class="pa-2 pl-0">Name<v-icon x-small color="red">mdi-asterisk</v-icon>
                                    :</v-card-subtitle>
                            </v-col>
                            <v-col cols="9">
                                <v-text-field label="Dataset Name" dense required v-model="createDto.name"
                                    :rules="[v => !!v || 'Required.', v => v.trim().length !== 0 || 'value error']"></v-text-field>
                            </v-col>
                            <v-col cols="3">
                                <v-card-subtitle class="pa-2 pl-0">Description :</v-card-subtitle>
                            </v-col>
                            <v-col cols="9">
                                <v-textarea name="input-7-1" label="Dataset Description" v-model="createDto.description"
                                    hint="Dataset Description"></v-textarea>
                            </v-col>
                        </v-row>
                    </v-form>
                </v-card-text>
                <v-card-actions class="justify-end">
                    <v-btn text @click="closeDialog">Cancel</v-btn>
                    <v-btn color="primary" text @click="submitDialog">Create</v-btn>
                </v-card-actions>
            </v-card>
        </v-dialog>
    </v-card>
</template>

<script>
export default {
    data: () => ({
        datasetDialog: {
            show: false,
        },
        createDto: {
            ml_task: 'all',
            name: '',
            description: '',
            valid: true,
        },
        selectItems: [
            { text: 'TEXT DEEP TAGGING', value: 0 },
            { text: 'IMAGE DEEP TAGGING', value: 1 },
            { text: 'VIRTUAL TRY-ON', value: 2 },
        ],
        filter: {
            selected: {
                ml_task: null,
                limit: 10,
            }
        },
        datasets: [],
        pagenation: {
            page: 1,
            length: 0,
        }
    }),
    mounted() {
        this.getDataset();
    },
    methods: {
        getDataset() {
            // 데이터셋 조회
        },
        createDataset() {
            // 데이터셋 생성
        },
        pageMove(pageNum) {
            this.pagenation.page = pageNum;
            this.getDataset();
        },
        openDialog() {
            this.datasetDialog.show = true;
        },
        closeDialog() {
            this.datasetDialog.show = false;
        },
        submitDialog() {
            // 대화 제출
        }
    }
}
</script>