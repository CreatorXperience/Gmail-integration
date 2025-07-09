import amqp, { ConsumeMessage } from "amqplib"
import { gmailMessageithAttachementValidator, gmailMessageValidator } from "../zod/gmailMessage"
import validateOrCreateMessage from "../utils/validateOrCreateMessage"
import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import upsertTask from "../utils/upsertTask"
import Redis from "../redis/redis"
const prisma = new PrismaClient()


enum TTaskStatus {
    QUEUED = "queued",
    SUCCESS = "success",
    FAILED = "failed"
}
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
            status: TTaskStatus.FAILED // default to fail, we'll update to true if successful
        };

        const integration = await prisma.integration.findUnique({ where: { id: data.integrationId } })

        if (!integration) {
            console.log("this is not suppose to happen, integration not found")
            return
        }
        oauth2_client.setCredentials({ access_token: integration.gmailAccessToken, refresh_token: integration.gmailRefreshToken })
        const gmail = google.gmail({ version: "v1", auth: oauth2_client })

        try {

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
            taskData.status = TTaskStatus.SUCCESS

        } catch (e) {
            taskData.status = TTaskStatus.FAILED
            channel.ack(message)
        }

        // for a task to fail , then a message already exist

        const { message: exist_msg, ...other } = data

        await upsertTask({
            channel,
            integration: taskData.integration,
            message,
            msgID: taskData.messageId,
            prisma,
            redis,
            status: taskData.status,
            taskId: data.taskId,
            workspaceId: taskData.workspaceId,
            q: "send_gmail_message",
            payload: JSON.stringify({ ...other, messageId: msgID })
        })

    })


    channel.consume("draft_gmail_message", async (message: ConsumeMessage | null) => {

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
            status: TTaskStatus.FAILED // default to fail, we'll update to true if successful
        };

        const integration = await prisma.integration.findUnique({ where: { id: data.integrationId } })

        if (!integration) {
            console.log("this is not suppose to happen, integration not found")
            return
        }
        oauth2_client.setCredentials({ access_token: integration.gmailAccessToken, refresh_token: integration.gmailRefreshToken })
        const gmail = google.gmail({ version: "v1", auth: oauth2_client })
        try {

            const raw_messages = [
                `To: ${data.recipient}`,
                'Content-Type: text/plain; charset="UTF-8"',
                'MIME-Version: 1.0',
                `Subject: ${data.subject ? data.subject : ""} `,
                '',
                data.text,
            ].join("\r\n")

            const base64Message = Buffer.from(raw_messages).toString("base64")

            await gmail.users.drafts.create({
                userId: "me",
                requestBody: {
                    message: {
                        raw: base64Message
                    }
                }
            })
            taskData.status = TTaskStatus.SUCCESS

        } catch (e) {
            taskData.status = TTaskStatus.FAILED
            channel.ack(message)
        }

        const { message: exist_msg, ...other } = data
        //NOTE: for a task to fail ,  a message has exist

        await upsertTask({
            channel,
            integration: taskData.integration,
            message,
            msgID: taskData.messageId,
            prisma,
            redis,
            taskId: data.taskId,
            status: taskData.status,
            workspaceId: taskData.workspaceId,
            q: "draft_gmail_message",
            payload: JSON.stringify({ ...other, messageId: msgID })
        })
    })


    channel.consume("send_gmail_message_with_attachement", async (message: ConsumeMessage | null) => {
        if (!message) {
            throw new Error("Null Rabbit Message")
        }

        const { error, data } = gmailMessageithAttachementValidator(JSON.parse(message.content.toString()))
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
            status: TTaskStatus.FAILED // default to fail, we'll update to true if successful
        };

        const integration = await prisma.integration.findUnique({ where: { id: data.integrationId } })

        if (!integration) {
            console.log("this is not suppose to happen, integration not found")
            return
        }
        oauth2_client.setCredentials({ access_token: integration.gmailAccessToken, refresh_token: integration.gmailRefreshToken })
        const gmail = google.gmail({ version: "v1", auth: oauth2_client })

        const boundary = `boundary_${Date.now()}`;

        try {

            const raw_messages = [
                `MIME-Version: 1.0`,
                `To: ${data.recipient}`,
                `Subject: ${data.subject}`,
                `Content-Type: multipart/mixed; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                `Content-Type: text/plain; charset="UTF-8"`,
                '',
                data.text,
                '',
                `--${boundary}`,
                `Content-Type: ${data.mimeType}; name="${data.filename}"`,
                `Content-Disposition: attachment; filename="${data.filename}"`,
                `Content-Transfer-Encoding: base64`,
                '',
                data.attachement,
                '',
                `--${boundary}--`,
            ].join('\n');

            const base64Message = Buffer.from(raw_messages).toString("base64url")

            await gmail.users.messages.send({
                userId: "me",
                requestBody: {
                    raw: base64Message
                }
            })
            taskData.status = TTaskStatus.SUCCESS

        } catch (e) {
            taskData.status = TTaskStatus.FAILED
            channel.ack(message)
        }

        // for a task to fail , then a message already exist

        const { message: exist_msg, ...other } = data

        await upsertTask({
            channel,
            integration: taskData.integration,
            message,
            msgID: taskData.messageId,
            prisma,
            redis,
            status: taskData.status,
            taskId: data.taskId,
            workspaceId: taskData.workspaceId,
            q: "send_gmail_message",
            payload: JSON.stringify({ ...other, messageId: msgID })
        })
    })

}

export default consumers