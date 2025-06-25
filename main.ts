import express from "express"
import dotenv from "dotenv"
import cors from "cors"
import gmailRouter from "./routes/gmail.routes"
import { PrismaClient } from "@prisma/client"
import { google } from "googleapis"
import type { TState } from "./types"
dotenv.config()
const app = express()


const prisma = new PrismaClient()

const oauth2_client = new google.auth.OAuth2(
    process.env.CLIENT_ID,
    process.env.CLIENT_SECRET,
    process.env.REDIRECT_URI + "/google/services"
)


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
        await prisma.integration.update({ where: { id: integration.id }, data: { gmailRefreshToken: tokens.refresh_token, gmailAccessToken: tokens.access_token } })
        return
    }

    await prisma.integration.create({
        data: {
            service: parsed_state.service,
            status: true,
            workspaceId: parsed_state.workspaceId,
            gmailAccessToken: tokens.access_token,
            gmailAccessTokenExpiryDate: tokens.expiry_date as number,
            gmailRefreshToken: tokens.refresh_token
        }
    })


    res.write("gmail integration activated successfully")
    res.end()
})





const PORT = 4000

app.listen(PORT, () => {
    console.log(`listening to port ${PORT}`)
})