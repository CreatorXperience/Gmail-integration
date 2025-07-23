import { Router } from "express";
const { SpacesServiceClient } = require('@google-apps/meet').v2;

const router = Router()

const getMeetRouter = <T>(oauth2_client: T | any) => {
    router.get("/oauth_url", (req, res) => {
        const workspaceId = req.query["workspaceId"]
        if (!workspaceId) {
            res.send({ message: "property workspaceId is required" })
            return
        }

        const state = encodeURIComponent(JSON.stringify({
            service: "meet",
            workspaceId,
        }))

        const url = oauth2_client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/meetings.space.created"],
            prompt: "consent",
            state
        })
        res.redirect(url)
        return
    })


    router.post("/meet", async (_, res) => {
        const spaceClient = new SpacesServiceClient({ authClient: oauth2_client })
        const [response] = await spaceClient.createSpace({})

        res.send({ message: "google meeting created successfully", uri: response.meetingUri })
    })


    return router
}





export default getMeetRouter