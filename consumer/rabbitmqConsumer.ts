import amqp, { ConsumeMessage } from "amqplib"
import { gmailMessageValidator } from "../zod/gmailMessage"
import validateOrCreateMessage from "../utils/validateOrCreateMessage"
import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import upsertTask from "../utils/upsertTask"
import Redis from "../redis/redis"
const prisma = new PrismaClient()
const consumers = (channel: amqp.Channel, oauth2_client: any, redis: Redis) => {

    channel.consume("send_gmail_message", async (message: ConsumeMessage | null) => {

        if (!message) {
            throw new Error("Null Rabbit Message")
        }

        const { error, data } = gmailMessageValidator(JSON.parse(message.content.toString()))
        if (error) {
            channel.nack(message, false, false)
            return
        }

        const msgID = await validateOrCreateMessage(channel, message, prisma, redis, data)
        if (!msgID) {
            channel.nack(message, false, false)
            throw new Error("messageId not found in both db")
        }

        const taskData = {
            messageId: msgID,
            integration: "gmail",
            text: "send gmail message",
            workspaceId: data.workspaceId,
            status: false // default to fail, we'll update to true if successful
        };

        const integration = await prisma.integration.findUnique({ where: { id: data.integrationId } })

        if (!integration) {
            console.log("this is not suppose to happen, integration not found")
            return
        }

        try {
            oauth2_client.setCredentials({ access_token: integration.gmailAccessToken, refresh_token: integration.gmailRefreshToken })
            const gmail = google.gmail({ version: "v1", auth: oauth2_client })
            const raw_messages = [
                `To: ${data.recipient}`,
                'Content-Type: text/plain; charset="UTF-8"',
                'MIME-Version: 1.0',
                'Subject: Test Subject',
                '',
                data.text,
            ].join("\r\n")

            const base64Message = Buffer.from(raw_messages).toString("base64")

            await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: base64Message
                }
            })
            taskData.status = true
        } catch (e) {
            taskData.status = false
            channel.ack(message)

            await upsertTask({
                channel,
                integration: taskData.integration,
                message,
                msgID: taskData.messageId,
                prisma,
                redis,
                status: taskData.status,
                workspaceId: taskData.workspaceId
            })

        }



    })

}

export default consumers