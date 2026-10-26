import { push, ref, serverTimestamp, set } from 'firebase/database';
import { auth, db } from './firebase_config';

const TRACKED_FIELDS = [
  'functionName', 'componentDetails', 'sapMaterialNo', 'childMaterialSapNo',
  'childMaterial', 'qtyPerCs', 'unit', 'childComponentIds',
];

const asText = (value) => (Array.isArray(value) ? value.join(', ') : String(value ?? ''));

export const bomChanges = (before = {}, after = {}) => TRACKED_FIELDS.reduce((changes, field) => {
  const from = asText(before[field]);
  const to = asText(after[field]);
  if (from !== to) changes[field] = { from, to };
  return changes;
}, {});

export const writeBomHistory = async ({ article, record, action, changes }) => {
  const historyRef = push(ref(db, 'bomHistory/'));
  const user = auth.currentUser;
  await set(historyRef, {
    id: historyRef.key,
    articleId: article?.id || record?.articleId || '',
    article: [article?.article, article?.colour ?? article?.color].filter(Boolean).join(' '),
    model: article?.model || '',
    componentId: record?.id || '',
    functionName: record?.functionName || '',
    componentDetails: record?.componentDetails || '',
    action,
    editorUid: user?.uid || 'unknown',
    editorEmail: user?.email || 'Unknown user',
    changes,
    timestamp: serverTimestamp(),
  });
};
