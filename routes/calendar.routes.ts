import { Router } from "express";

const router = Router()

const getCalendarRouter = <T>(oauth2_client: T | any) => {
    router.get("/oauth_url", (req, res) => {
        const workspaceId = req.query["workspaceId"]
        if (!workspaceId) {
            res.send({ message: "property workspaceId is required" })
            return
        }
        const state = encodeURIComponent(JSON.stringify({
            service: "calendar",
            workspaceId,
        }))

        const url = oauth2_client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/calendar"],
            prompt: "consent",
            state
        })
        res.redirect(url)
        return
    })


    return router
}

export default getCalendarRouter