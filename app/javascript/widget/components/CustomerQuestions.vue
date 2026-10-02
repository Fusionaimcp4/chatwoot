<script setup>
import { computed, ref, watch } from 'vue';
import { useStore, useMapGetter } from 'dashboard/composables/store';
import { useRouter } from 'vue-router';
import {
  getCustomerQuestionsConfig,
  selectVisibleCustomerQuestions,
} from 'widget/helpers/customerQuestions';

const store = useStore();
const router = useRouter();

const selectedId = ref(null);
const dismissed = ref(false);
const isCustomerQuestionAnswerOpen = useMapGetter(
  'appConfig/getIsCustomerQuestionAnswerOpen'
);

const channelConfig = computed(() => window.chatwootWebChannel || {});
const widgetSettings = computed(
  () =>
    channelConfig.value.widgetSettings ||
    channelConfig.value.widget_settings ||
    {}
);

const visibleQuestions = computed(() => {
  const config = getCustomerQuestionsConfig(widgetSettings.value);
  return selectVisibleCustomerQuestions(config);
});

const selectedQuestion = computed(() =>
  visibleQuestions.value.find(item => item.id === selectedId.value)
);

const displayedQuestions = computed(() => {
  if (dismissed.value) return [];
  if (selectedQuestion.value) return [selectedQuestion.value];
  return visibleQuestions.value;
});

watch(isCustomerQuestionAnswerOpen, isOpen => {
  if (!isOpen && selectedId.value) {
    selectedId.value = null;
  }
});

const setAnswerOpen = isOpen => {
  store.dispatch('appConfig/setCustomerQuestionAnswerOpen', isOpen);
};

const onQuestionClick = async question => {
  if (dismissed.value) return;

  if (question.type === 'static') {
    selectedId.value = question.id;
    setAnswerOpen(true);
    return;
  }

  if (question.type === 'ai') {
    dismissed.value = true;
    selectedId.value = null;
    setAnswerOpen(false);
    await router.replace({ name: 'messages' });
    await store.dispatch('conversation/sendMessage', {
      content: question.question,
    });
  }
};
</script>

<template>
  <!-- eslint-disable-next-line vue/no-root-v-if -->
  <div
    v-if="displayedQuestions.length"
    class="flex w-full flex-col items-start gap-1.5"
    data-testid="customer-questions"
  >
    <template v-for="question in displayedQuestions" :key="question.id">
      <button
        type="button"
        class="max-w-full w-fit rounded-full border border-n-weak bg-n-background px-3 py-1.5 text-left text-xs leading-snug text-n-slate-12 shadow-sm transition-colors duration-150 hover:border-n-slate-6 hover:bg-n-alpha-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-n-brand dark:bg-n-solid-2 dark:hover:bg-n-solid-3"
        :class="{
          'cursor-default hover:border-n-weak hover:bg-n-background dark:hover:bg-n-solid-2':
            selectedId === question.id,
        }"
        :aria-pressed="selectedId === question.id"
        @click="onQuestionClick(question)"
      >
        <span class="block break-words">{{ question.question }}</span>
      </button>

      <div
        v-if="
          selectedId === question.id &&
          question.type === 'static' &&
          question.answer
        "
        class="mt-1 max-w-full rounded-lg bg-n-background px-3 py-2 text-xs leading-snug text-n-slate-12 dark:bg-n-solid-3"
        data-testid="customer-question-answer"
      >
        <p class="break-words whitespace-pre-wrap">{{ question.answer }}</p>
      </div>
    </template>
  </div>
</template>
