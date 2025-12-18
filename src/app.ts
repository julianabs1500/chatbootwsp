import * as dotenv from 'dotenv'
import { join } from 'path'
import { createBot, createProvider, createFlow, addKeyword, utils, EVENTS } from '@builderbot/bot'
import { MemoryDB as Database } from '@builderbot/bot'
import { MetaProvider as Provider } from '@builderbot/provider-meta'
import ffmpeg from 'fluent-ffmpeg';
import { existsSync } from 'fs';

// Ruta del sistema
const systemFfmpeg = '/usr/bin/ffmpeg';

if (existsSync(systemFfmpeg)) {
  ffmpeg.setFfmpegPath(systemFfmpeg);
} else {
  console.warn('No se encontró ffmpeg en /usr/bin, fluent-ffmpeg intentará usar @ffmpeg-installer/ffmpeg');
}



dotenv.config()

const PORT = process.env.PORT ?? 3008




const welcomeFlow = addKeyword(EVENTS.WELCOME)
  .addAnswer(
    `¡Hola! Soy Tabot y te doy la bienvenida. Para comenzar, acepta los términos

Marca 1 para Aceptar 👍
Marca 2 para Rechazar 👎`,
    { capture: true },
    async ( ctx, { gotoFlow, fallBack }) => {
      if (ctx.body === '1') return gotoFlow(identityFlow);
      if (ctx.body === '2') return; // silencio total
      return fallBack();
    }
  );


const identityFlow = addKeyword(EVENTS.ACTION)

  // 1️⃣ Selección de tipo de documento
  .addAnswer(
    `Queremos confirmar tu identidad 🧐
Responde con el número qué identificación tienes:

1. NIT
2. Cédula de ciudadanía
3. Cédula de extranjería
4. Pasaporte
5. Tarjeta de identidad
6. Registro civil`,
    { capture: true },
    async (ctx, { fallBack, state }) => {
      const validOptions = ['1', '2', '3', '4', '5', '6'];
      const answer = ctx.body.trim();

      if (!validOptions.includes(answer)) {
        return fallBack();
      }

      await state.update({ documentType: answer });
    }
  )

  // 2️⃣ Número de identificación
// 2️⃣ Número de identificación
.addAnswer(
  `Ahora, escribe tu número de identificación sin comas, puntos o espacios.`,
  { capture: true },
  async (ctx, { state, flowDynamic }) => {
    await state.update({ documentNumber: ctx.body.trim() });

    await flowDynamic(`¡Muy bien! 👏 Ya te registraste`);
  }
)

// 3️⃣ Opciones 1–4
.addAnswer(
  `Escribe el número de la opción: 👇

1. 💼 Productos Bancolombia: cuentas, tarjetas, créditos, inversiones

2. 📥 Documentos: certificados y extractos

3. 🏦 Oficinas, cajeros, corresponsales y líneas

4. 📱 Apps y sucursales virtuales

5. 🔐 Seguridad, bloqueos y claves

6. 🌎 Bancolombia en el exterior

7. ❓ Otras consultas

🏢 ¿Buscas opciones para pymes o empresas? Escribe Empresa.`,
  { capture: true },
  async (ctx, { fallBack, state }) => {
    const validOptions = ['1', '2', '3', '4', '5', '6', '7'];
    const answer = ctx.body.trim();

    if (!validOptions.includes(answer)) {
      return fallBack();
    }

    // Guardamos la opción elegida
    await state.update({ selectedOption: answer });
    // 👉 NO enviar nada aquí, el flujo continúa
  }
)


.addAnswer(
  null,
  null,
  async (ctx, { provider }) => {
    const button = {
      body: 'Iniciar sesión',              // Texto que aparece en WhatsApp
      url: 'https://google.com',     // URL destino
      text: 'Login'                        // Texto interno (opcional)
    };

    await provider.sendButtonUrl(
      ctx.from,
      button,
      `🔐 Inicio de sesión

Para poder continuar, debemos confirmar tú identidad. Sigue estos pasos: 👇

1⃣ Toca el botón iniciar sesión, abajo 
2⃣ Entra con el usuario y clave que usas en la App Bancolombia o sucursal virtual Personas.
3️⃣ Regresa a WhatsApp luego de confirmar tú identidad, para terminar tú solicitud.`
    );
  }
);








const registerFlow = addKeyword<Provider, Database>(utils.setEvent('REGISTER_FLOW'))
    .addAnswer(`What is your name?`, { capture: true }, async (ctx, { state }) => {
        await state.update({ name: ctx.body })
    })
    .addAnswer('What is your age?', { capture: true }, async (ctx, { state }) => {
        await state.update({ age: ctx.body })
    })
    .addAction(async (_, { flowDynamic, state }) => {
        await flowDynamic(`${state.get('name')}, thanks for your information!: Your age: ${state.get('age')}`)
    })

const fullSamplesFlow = addKeyword<Provider, Database>(['samples', utils.setEvent('SAMPLES')])
    .addAnswer(`💪 I'll send you a lot files...`)
    .addAnswer(`Send image from Local`, { media: join(process.cwd(), 'assets', 'sample.png') })
    .addAnswer(`Send video from URL`, {
        media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYTJ0ZGdjd2syeXAwMjQ4aWdkcW04OWlqcXI3Ynh1ODkwZ25zZWZ1dCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/LCohAb657pSdHv0Q5h/giphy.mp4',
    })
    .addAnswer(`Send audio from URL`, { media: 'https://cdn.freesound.org/previews/728/728142_11861866-lq.mp3' })
    .addAnswer(`Send file from URL`, {
        media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    })

const main = async () => {
    const adapterFlow = createFlow([welcomeFlow, identityFlow])
    const adapterProvider = createProvider(Provider, {
        jwtToken: process.env.jwtToken,
        numberId: process.env.numberId,
        verifyToken: process.env.verifyToken,
        version: 'v22.0'
    })
    const adapterDB = new Database()

    const { handleCtx, httpServer } = await createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,
    })

    adapterProvider.server.post(
        '/v1/messages',
        handleCtx(async (bot, req, res) => {
            const { number, message, urlMedia } = req.body
            await bot.sendMessage(number, message, { media: urlMedia ?? null })
            return res.end('sended')
        })
    )

    adapterProvider.server.post(
        '/v1/register',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('REGISTER_FLOW', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/samples',
        handleCtx(async (bot, req, res) => {
            const { number, name } = req.body
            await bot.dispatch('SAMPLES', { from: number, name })
            return res.end('trigger')
        })
    )

    adapterProvider.server.post(
        '/v1/blacklist',
        handleCtx(async (bot, req, res) => {
            const { number, intent } = req.body
            if (intent === 'remove') bot.blacklist.remove(number)
            if (intent === 'add') bot.blacklist.add(number)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', number, intent }))
        })
    )

    adapterProvider.server.get(
        '/v1/blacklist/list',
        handleCtx(async (bot, req, res) => {
            const blacklist = bot.blacklist.getList()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            return res.end(JSON.stringify({ status: 'ok', blacklist }))
        })
    )


    httpServer(+PORT)
}

main()
