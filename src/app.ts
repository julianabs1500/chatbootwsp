import * as dotenv from 'dotenv';
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS
} from '@builderbot/bot';
import { MemoryDB as Database } from '@builderbot/bot';
import { MetaProvider as Provider } from '@builderbot/provider-meta';

import admin from 'firebase-admin';
import serviceAccount from './firebase/firebase-key.json';

dotenv.config();

/* ─────────────────────────────────────────────
   🔥 FIREBASE INIT
───────────────────────────────────────────── */
admin.initializeApp({
  credential: admin.credential.cert(
    serviceAccount as admin.ServiceAccount
  ),
});

const firestore = admin.firestore();

/* ─────────────────────────────────────────────
   💾 SAVE MESSAGE
───────────────────────────────────────────── */
const saveIncomingMessage = async (ctx: any) => {
  if (!ctx?.from) return;

  await firestore.collection('messages').add({
    from: ctx.from,
    to: 'BOT',
    body: ctx.body ?? '',
    type: ctx.type ?? 'text',
    direction: 'IN',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await firestore
    .collection('conversations')
    .doc(ctx.from)
    .set(
      {
        phone: ctx.from,
        lastMessage: ctx.body ?? '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
};

/* ─────────────────────────────────────────────
   👋 WELCOME FLOW
───────────────────────────────────────────── */
const welcomeFlow = addKeyword(EVENTS.WELCOME)
  .addAnswer(
    `¡Hola! Soy Tabot y te doy la bienvenida. Para comenzar, acepta los términos

Marca 1 para Aceptar 👍
Marca 2 para Rechazar 👎`,
    { capture: true },
    async ( ctx, { gotoFlow, fallBack }) => {
       await saveIncomingMessage(ctx);
      if (ctx.body === '1') return gotoFlow(identityFlow);
      if (ctx.body === '2') return; // silencio total
      return fallBack();
    }
  );

/* ─────────────────────────────────────────────
   🪪 IDENTITY FLOW
───────────────────────────────────────────── */
const identityFlow = addKeyword(EVENTS.ACTION)

  .addAnswer(
    `Queremos confirmar tu identidad 🧐
Responde con el número:

1. NIT
2. Cédula
3. Cédula extranjería
4. Pasaporte
5. Tarjeta identidad
6. Registro civil`,
    { capture: true },
    async (ctx, { fallBack, state }) => {
      await saveIncomingMessage(ctx);

      const valid = ['1', '2', '3', '4', '5', '6'];
      if (!valid.includes(ctx.body.trim())) return fallBack();
      await state.update({ documentType: ctx.body.trim() });
    }
  )

  .addAnswer(
    `Escribe tu número de identificación`,
    { capture: true },
    async (ctx, { state, flowDynamic }) => {
      await saveIncomingMessage(ctx);

      await state.update({ documentNumber: ctx.body.trim() });
      await flowDynamic(`¡Registro completo! ✅`);
    }
  )

  .addAnswer(
    `Elige una opción:

1. Productos
2. Documentos
3. Oficinas
4. Apps
5. Seguridad
6. Exterior
7. Otras`,
    { capture: true },
    async (ctx, { fallBack, state }) => {
      await saveIncomingMessage(ctx);

      const valid = ['1', '2', '3', '4', '5', '6', '7'];
      if (!valid.includes(ctx.body.trim())) return fallBack();
      await state.update({ selectedOption: ctx.body.trim() });
    }
  )

  .addAnswer(null, null, async (ctx, { provider }) => {
    await saveIncomingMessage(ctx);

    await provider.sendButtonUrl(
      ctx.from,
      {
        body: 'Iniciar sesión',
        url: 'https://google.com',
      },
      `🔐 Para continuar, inicia sesión y regresa a WhatsApp`
    );
  });

/* ─────────────────────────────────────────────
   🚀 MAIN
───────────────────────────────────────────── */
const PORT = process.env.PORT ?? 3008;

const main = async () => {
  const adapterFlow = createFlow([
    welcomeFlow,
    identityFlow,
  ]);

  const adapterProvider = createProvider(Provider, {
    jwtToken: process.env.jwtToken,
    numberId: process.env.numberId,
    verifyToken: process.env.verifyToken,
    version: 'v22.0',
  });

  const adapterDB = new Database();

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  httpServer(+PORT);
};

main();
