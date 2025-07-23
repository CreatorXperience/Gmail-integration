import consumers from "../consumer/rabbitmqConsumer"
import amqp from "amqplib"
import Redis from "../redis/redis"
const connectRabbitMQ = async (oauth2_client: any, redis: Redis) => {
    try {
        const RABBIT_MQ_URL = process.env.NODE_ENV === "production" ? process.env.RABBIT_MQ_SERVER : "amqp://localhost"
        const connection = await amqp.connect(RABBIT_MQ_URL as string)
        const channel = await connection.createChannel()

        channel.assertQueue("send_gmail_message")
        channel.assertQueue("draft_gmail_message")
        channel.assertQueue("send_gmail_message_with_attachement")
        channel.assertQueue("create_calendar_event")
        consumers(channel, oauth2_client, redis)
    } catch (e) {
        console.log("❌ 🐰 an Error occured while connecting to RabbitMQ")
    }
}


export default connectRabbitMQ