import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import gmailRouter from "./routes/gmail.routes"
import meetRouter from "./routes/meet.routes"
import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import type { TState } from "./types"
import serviceMap from "./utils/serviceMap"
import Redis from "./redis/redis"
import calendarRouter from "./routes/calendar.routes"
import connectRabbitMQ from "./utils/connectRabbitMq"
dotenv.config()
const app = express()


const prisma = new PrismaClient()

const redis = new Redis()


const oauth2_client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI + "/google/services",
)




app.use(cors())
app.use(express.json())

app.use("/app/gmail", gmailRouter(oauth2_client))
app.use("/app/calendar", calendarRouter(oauth2_client))
app.use("/app/meet", meetRouter(oauth2_client))



app.get("/google/services", async (req, res) => {
    const code = req.query["code"]
    const state = req.query["state"]
    if (!code) {
        res.status(404).send({ message: "code not found, google authentication failed" })
        return
    }
    const { tokens } = await oauth2_client.getToken(code as string)

    const parsed_state = JSON.parse(decodeURIComponent(state as string)) as TState
    const integration = await prisma.integration.findFirst({
        where: {
            workspaceId: parsed_state.workspaceId,
            service: parsed_state.service
        }
    })

    if (integration) {
        await prisma.integration.update({ where: { id: integration.id }, data: { gmailAccessToken: tokens.access_token } })
        res.send(`${parsed_state.service} integration successful`)
        return
    }
    //NOTE: creation of access token is for specific gmail service e.g gmail, drive

    const credentials = serviceMap(parsed_state.service, tokens.access_token as string, tokens.expiry_date as number, tokens.refresh_token as string)
    if (!credentials) {
        res.status(404).send({ message: "service not supported" })
        return
    }

    await prisma.$transaction(async (tx) => {
        await tx.integration.create({
            data: {
                service: parsed_state.service,
                status: true,
                workspaceId: parsed_state.workspaceId,
                ...credentials
            }
        })


        await tx.workspace.update({ where: { id: parsed_state.workspaceId, }, data: { integrations: { push: "calendar" } } })
    })



    res.send(`${parsed_state.service} integration activated successfully`);
})





const PORT = 4000

app.listen(PORT, async () => {
    await connectRabbitMQ(oauth2_client, redis)
    try {
        await redis.connect()
        console.log("🔗connected to redis successfully")
    } catch (e) {
        console.log(" 📮 ❌ an error occured while connecting to redis")
    }
    console.log(`☑️ listening to port ${PORT}`)
})