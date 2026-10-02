/** Study exposure is not a graded question attempt or evidence of PBL mastery. */
export interface ExampleStudyEvent {
  id: string;
  exampleId: string;
  itemId?: string;
  unitId: string;
  kind: 'attempt' | 'reveal';
  reflection?: string;
  createdAt: string;
}
const storageKey = (uid?: string) => `suveca_example_study_v1_${uid || 'guest'}`;
export function readExampleStudy(uid?: string): ExampleStudyEvent[] {
  try {
    const data = JSON.parse(localStorage.getItem(storageKey(uid)) || '[]');
    return Array.isArray(data) ? data.filter(event => event && typeof event.id === 'string'
      && typeof event.exampleId === 'string' && typeof event.unitId === 'string'
      && ['attempt', 'reveal'].includes(event.kind) && Number.isFinite(Date.parse(event.createdAt))) : [];
  } catch { return []; }
}
export function saveExampleStudy(uid: string | undefined, event: Omit<ExampleStudyEvent, 'id' | 'createdAt'>): boolean {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify([...readExampleStudy(uid), {
      ...event, reflection: event.reflection?.slice(0, 4000), id: crypto.randomUUID(), createdAt: new Date().toISOString(),
    }].slice(-500)));
    return true;
  } catch { return false; }
}
