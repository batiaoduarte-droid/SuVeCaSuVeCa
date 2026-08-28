import type { OfficialQuestionFilters } from './officialQuestions';
import type { TabType } from '../components/Navbar';

const TOOL_TABS = new Set<TabType>([
  'modules', 'pbl', 'analyzer', 'simulado', 'errors', 'flashcards', 'agenda',
  'decision', 'planner', 'duel', 'questions', 'stats', 'profile', 'pomodoro',
]);

export interface ToolLocation {
  tab: TabType;
  questionId: string | null;
  questionFilters: OfficialQuestionFilters;
  editorialPractice: boolean;
}

export const readToolLocation = (search = window.location.search): ToolLocation => {
  const params = new URLSearchParams(search);
  const requested = params.get('tool') as TabType | null;
  return {
    tab: requested && TOOL_TABS.has(requested) ? requested : 'modules',
    questionId: params.get('question'),
    questionFilters: {
      query: params.get('q') || undefined,
      moduleId: params.get('q_module') || undefined,
      topic: params.get('q_topic') || undefined,
      bank: params.get('q_bank') || undefined,
      year: params.get('q_year') || undefined,
    },
    editorialPractice: params.get('practice') === 'editorial',
  };
};

export const toolLocationUrl = (
  currentUrl: string,
  location: Partial<ToolLocation> & Pick<ToolLocation, 'tab'>,
): string => {
  const url = new URL(currentUrl);
  const setOrDelete = (key: string, value?: string | null) => value
    ? url.searchParams.set(key, value)
    : url.searchParams.delete(key);
  setOrDelete('tool', location.tab === 'modules' ? null : location.tab);
  setOrDelete('question', location.questionId);
  setOrDelete('practice', location.editorialPractice ? 'editorial' : null);
  if (location.questionFilters) {
    setOrDelete('q', location.questionFilters.query);
    setOrDelete('q_module', location.questionFilters.moduleId);
    setOrDelete('q_topic', location.questionFilters.topic);
    setOrDelete('q_bank', location.questionFilters.bank);
    setOrDelete('q_year', location.questionFilters.year === undefined ? undefined : String(location.questionFilters.year));
  }
  return `${url.pathname}${url.search}${url.hash}`;
};

export const writeToolLocation = (
  location: Partial<ToolLocation> & Pick<ToolLocation, 'tab'>,
  mode: 'push' | 'replace' = 'push',
) => {
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](
    {},
    '',
    toolLocationUrl(window.location.href, location),
  );
};
