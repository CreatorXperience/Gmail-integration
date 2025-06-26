import { Router } from "express";
const router = Router()


const getGmailRouter = <T>(oauth2_client: T | any) => {
    router.get("/oauth_url", (req, res) => {
        const workspaceId = req.query["workspaceId"]
        if (!workspaceId) {
            res.send({ message: "property workspaceId is required" })
            return
        }

        const state = encodeURIComponent(JSON.stringify({
            service: "gmail",
            workspaceId,
        }))

        const url = oauth2_client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://mail.google.com/"],
            state
        })
        console.log(url)
        res.redirect(url)
        return
    })

    return router
}



export default getGmailRouter