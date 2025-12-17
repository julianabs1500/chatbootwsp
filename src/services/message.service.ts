import { firestore } from '../firebase/firebase';
import admin from 'firebase-admin';

export const saveIncomingMessage = async (ctx) => {
  if (!ctx?.from) return;

  await firestore.collection('messages').add({
    from: ctx.from,
    to: 'BOT',
    body: ctx.body ?? '',
    type: ctx.type ?? 'text',
    direction: 'IN',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await firestore.collection('conversations')
    .doc(ctx.from)
    .set({
      phone: ctx.from,
      lastMessage: ctx.body ?? '',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
};
