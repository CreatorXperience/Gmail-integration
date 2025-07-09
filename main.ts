import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import gmailRouter from "./routes/gmail.routes"
import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import type { TState } from "./types"
import serviceMap from "./utils/serviceMap"
import amqp from "amqplib"
import Redis from "./redis/redis"
import consumers from "./consumer/rabbitmqConsumer"
dotenv.config()
const app = express()


const prisma = new PrismaClient()

const redis = new Redis()


const oauth2_client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI + "/google/services",
)

const createRabbitMQ = async () => {
    try {
        const RABBIT_MQ_URL = process.env.NODE_ENV === "production" ? process.env.RABBIT_MQ_SERVER : "amqp://localhost"
        const connection = await amqp.connect(RABBIT_MQ_URL as string)
        const channel = await connection.createChannel()

        channel.assertQueue("send_gmail_message")
        channel.assertQueue("draft_gmail_message")
        consumers(channel, oauth2_client, redis)
    } catch (e) {
        console.log("❌ 🐰 an Error occured while connecting to RabbitMQ")
    }
}



app.use(cors())
app.use(express.json())

app.use("/app/gmail", gmailRouter(oauth2_client))



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
        res.send("gmail integration successful")
        return
    }
    //NOTE: creation of access token is for specific gmail service e.g gmail, drive

    const credentials = serviceMap(parsed_state.service, tokens.access_token as string, tokens.expiry_date as number, tokens.refresh_token as string)
    if (!credentials) {
        res.status(404).send({ message: "service not supported" })
        return
    }
    await prisma.integration.create({
        data: {
            service: parsed_state.service,
            status: true,
            workspaceId: parsed_state.workspaceId,
            ...credentials
        }
    })


    res.send("gmail integration activated successfully");
})





const PORT = 4000

app.listen(PORT, async () => {
    await createRabbitMQ()
    try {
        await redis.connect()
        console.log("🔗connected to redis successfully")
    } catch (e) {
        console.log(" 📮 ❌ an error occured while connecting to redis")
    }
    console.log(`☑️ listening to port ${PORT}`)
})