import z from "zod"
const gmailMessage = z.object({
    text: z.string({ message: "property message is required" }),
    recipient: z.string({ message: "property recipient is required" }),
    messageId: z.string({ message: "property messageId is required" }),
    workspaceId: z.string({ message: "property string is required" }),
    integrationId: z.string({ message: "property integrationId is required" }),
    subject: z.string({ message: "property subject is required to send an email" }),
    taskId: z.string({ message: "property taskId is required" }),
    message: z.object({
        channelId: z.string({ message: "property channelId is required" }),
        projectId: z.string({ message: "property projectId is required" }),
        threadId: z.string({ message: "property threadId is required" }),
        user: z.string({ message: "property user is required" }),
        userId: z.string({ message: "property userId is required" }),
    }).optional()
})

type TGmailMessage = Partial<z.infer<typeof gmailMessage>>

const gmailMessageValidator = (payload: TGmailMessage) => {
    return gmailMessage.required().partial({ subject: true, message: true, messageId: true }).safeParse(payload)
}

const gmailMessageWithAttachement = z.object({
    text: z.string({ message: "property message is required" }),
    recipient: z.string({ message: "property recipient is required" }),
    messageId: z.string({ message: "property messageId is required" }),
    workspaceId: z.string({ message: "property string is required" }),
    integrationId: z.string({ message: "property integrationId is required" }),
    subject: z.string({ message: "property subject is required to send an email" }),
    taskId: z.string({ message: "property taskId is required" }),
    attachement: z.string({ message: 'property attachement is required' }),
    mimeType: z.string({ message: 'property mimeType is required' }),
    filename: z.string({ message: 'property filename is required' }),
    message: z.object({
        channelId: z.string({ message: "property channelId is required" }),
        projectId: z.string({ message: "property projectId is required" }),
        threadId: z.string({ message: "property threadId is required" }),
        user: z.string({ message: "property user is required" }),
        userId: z.string({ message: "property userId is required" }),
    }).optional()
})



const gmailMessageithAttachementValidator = (payload: TGmailMessage) => {
    return gmailMessageWithAttachement.required().partial({ subject: true, message: true, messageId: true }).safeParse(payload)
}

export { gmailMessageValidator, TGmailMessage, gmailMessageithAttachementValidator }