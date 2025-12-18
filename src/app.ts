import * as dotenv from 'dotenv'
import {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
  EVENTS,
} from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import admin from 'firebase-admin'
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath("ffmpeg");


dotenv.config()

/* ─────────────────────────────────────────────
   🔐 FIREBASE SERVICE ACCOUNT (ENV)
───────────────────────────────────────────── */
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
}

/* ─────────────────────────────────────────────
   🔥 FIREBASE INIT
───────────────────────────────────────────── */
admin.initializeApp({
  credential: admin.credential.cert(
    serviceAccount as admin.ServiceAccount
  ),
})

const firestore = admin.firestore()

/* ─────────────────────────────────────────────
   💾 SAVE MESSAGE
───────────────────────────────────────────── */
const saveIncomingMessage = async (ctx: any): Promise<void> => {
  if (!ctx?.from) return

  await firestore.collection('messages').add({
    from: ctx.from,
    to: 'BOT',
    body: ctx.body ?? '',
    type: ctx.type ?? 'text',
    direction: 'IN',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  })

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
    )
}

/* ─────────────────────────────────────────────
   👋 WELCOME FLOW
───────────────────────────────────────────── */
const welcomeFlow = addKeyword(EVENTS.WELCOME).addAnswer(
  `¡Hola! Soy Tabot y te doy la bienvenida. Para comenzar, acepta los términos

Marca 1 para Aceptar 👍
Marca 2 para Rechazar 👎`,
  { capture: true },
  async (
    ctx: any,
    { gotoFlow, fallBack }: any
  ) => {
    await saveIncomingMessage(ctx)

    if (ctx.body === '1') return gotoFlow(identityFlow)
    if (ctx.body === '2') return
    return fallBack()
  }
)

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
    async (
      ctx: any,
      { fallBack, state }: any
    ) => {
      await saveIncomingMessage(ctx)

      const valid = ['1', '2', '3', '4', '5', '6']
      if (!valid.includes(ctx.body.trim())) return fallBack()

      await state.update({ documentType: ctx.body.trim() })
    }
  )

  .addAnswer(
    `Escribe tu número de identificación`,
    { capture: true },
    async (
      ctx: any,
      { state, flowDynamic }: any
    ) => {
      await saveIncomingMessage(ctx)

      await state.update({ documentNumber: ctx.body.trim() })
      await flowDynamic('¡Registro completo! ✅')
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
    async (
      ctx: any,
      { fallBack, state }: any
    ) => {
      await saveIncomingMessage(ctx)

      const valid = ['1', '2', '3', '4', '5', '6', '7']
      if (!valid.includes(ctx.body.trim())) return fallBack()

      await state.update({ selectedOption: ctx.body.trim() })
    }
  )

  // ⚠️ NO null → string vacío + undefined
.addAnswer(
  '🔐 Para continuar, inicia sesión tocando el botón:',
  undefined,
  async (ctx: any, { provider }: any) => {
    await provider.sendButtonUrl(
      ctx.from,
      {
        body: 'Iniciar sesión',
        url: 'https://google.com',
      }
    )
  }
)


/* ─────────────────────────────────────────────
   🚀 MAIN
───────────────────────────────────────────── */
const PORT = Number(process.env.PORT ?? 3008)

const main = async (): Promise<void> => {
  const adapterFlow = createFlow([
    welcomeFlow,
    identityFlow,
  ])

  const adapterProvider = createProvider(Provider, {
    jwtToken: process.env.jwtToken as string,
    numberId: process.env.numberId as string,
    verifyToken: process.env.verifyToken as string,
    version: 'v22.0',
  })

  const adapterDB = new Database()

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  })

  httpServer(PORT)
}

main().catch(console.error)
